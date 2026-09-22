# Phoenix AI – Smart Agriculture Platform: Trained ML Crop Advisory

A real machine learning pipeline for the Phoenix AI crop advisory module: a trained, evaluated, and serialised model, a backend service that loads it once and serves predictions, and a frontend connector + demo UI.

No dummy predictions. No hardcoded advisory results. Every advisory the API returns is generated from the trained model's output, the farmer's actual inputs, and an agronomy knowledge base.

```text
Farmer Enters Field Details
  ↓ Backend Validates the Inputs (routes/advisory.js)
  ↓ Preprocessing Pipeline (ml/preprocess.py – identical to training)
  ↓ Trained ML Model Predicts (ml/saved_models/crop_advisory_pipeline.pkl)
  ↓ Advisory + Reason + Preventive Action (ml/predict.py + ml/knowledge_base.py)
  ↓ Frontend Displays Recommendations (frontend/js/advisory.js + demo UI)
```

---

## Repository Layout

```text
phoenix-ai-ml/
├── ml/                                 # Python ML module
│   ├── dataset/crop_recommendation.csv # Real benchmark dataset (2,200 × 8)
│   ├── dataset/README.md               # Dataset provenance + limitations
│   ├── notebooks/eda_report.md         # Auto-generated EDA report (+ plots/)
│   ├── explore_dataset.py              # EDA script
│   ├── preprocess.py                   # Feature contract + pipeline step
│   ├── knowledge_base.py               # Agronomy guidance per crop/stage
│   ├── train_model.py                  # Full training pipeline
│   ├── evaluate_model.py               # Standalone evaluation of saved model
│   ├── predict.py                      # AdvisoryService (schema + explanation)
│   ├── predict_service.py              # NDJSON worker used by the backend
│   ├── saved_models/                   # Trained artifacts
│   │   ├── crop_advisory_pipeline.pkl  # Preprocessing + calibrated model
│   │   ├── crop_advisory_metadata.json # Labels, thresholds, metrics
│   │   ├── crop_stats.json             # Per-crop reference envelopes
│   │   ├── evaluation_report.md        # Full training report
│   │   └── plots/                      # Confusion matrix, feature importances
│   ├── requirements.txt
│   └── README.md                       # ML-module docs
├── backend/
│   ├── services/advisoryService.js     # Node ↔ Python model bridge
│   ├── routes/advisory.js              # POST /api/advisory (+ health)
│   └── INTEGRATION.md                  # Plug into your server.js
├── frontend/
│   ├── js/advisory.js                  # Drop-in connector for your UI
│   ├── css/advisory.css                # Phoenix green result styles
│   └── INTEGRATION.md                  # How to wire your advisory page
├── demo/
│   ├── server.js                       # Standalone demo server
│   └── public/index.html               # Advisory UI (preview this)
└── package.json                        # Express (for the demo/backend route)
```

---

## The Model Specification

| Question | Answer |
|---|---|
| **Task** | Multiclass classification – crop suitability over soil + weather profiles |
| **Dataset** | Crop Recommendation benchmark (Kaggle), 2,200 rows, 22 crops, 0 missing, 0 duplicates, perfectly balanced |
| **Features** | `N`, `P`, `K` (soil nutrient indices), `temperature` (°C), `humidity` (%), `ph`, `rainfall` (mm) |
| **Target** | `label` – one of 22 crops |
| **Split** | 80/20 stratified; plus a 15% tune slice (test set never touched until final eval) |
| **Candidates** | RandomForest, ExtraTrees, GradientBoosting, DecisionTree (5-fold stratified CV, scored by F1-macro) |
| **Selected Model** | **RandomForest** – CV F1-macro `0.9926 ± 0.010`, beating the others |
| **Calibration** | Sigmoid (Platt) calibration → honest confidence scores |
| **Final Test Metrics** | Accuracy `0.9932`, Precision (macro) `0.9935`, Recall (macro) `0.9932`, F1 (macro) `0.9932`, F1 (weighted) `0.9932` |
| **Decision Thresholds** | Low-confidence flag tuned on tune slice (`0.55`); risk bands saved in metadata |
| **Saved Pipeline** | `crop_advisory_pipeline.pkl` (joblib) – includes preprocessing step for zero train/serve skew |

---

## Explainable JSON Advisory Output

For every prediction the API returns:

```json
{
  "predictedCrop": "rice",
  "confidence": 0.9429,
  "riskLevel": "High",
  "lowConfidence": false,
  "growthStage": "Flowering / Fruit setting",
  "irrigationRecommendation": "Critical stage – any moisture stress now will cut yield sharply…",
  "fertilizerRecommendation": "Apply the second nitrogen split before flowering…",
  "soilRecommendation": "Soil pH 6.5 is within the ideal range for rice…",
  "maintenanceRecommendation": "Scout weekly for pests/diseases…",
  "weatherPrecautions": [
    "Weather conditions are within the expected range…"
  ],
  "preventiveActions": [
    "blast and bacterial leaf blight risk in humid weather",
    "brown planthopper outbreaks in dense canopies"
  ],
  "reason": "The trained model matched your field profile to rice with 94% confidence…",
  "keyInputFactors": [
    "temperature 24.0°C",
    "humidity 82.0%"
  ],
  "conditionFlags": [],
  "cropHealthStatus": "Healthy – conditions match the typical profile for this crop",
  "riskExplanation": "Risk level combines the crop's known pest/disease attention level (high) with model confidence.",
  "yieldEstimate": {
    "range": [18, 26],
    "unit": "quintals per acre"
  },
  "top3Candidates": [
    { "crop": "rice", "probability": 0.9429 },
    { "crop": "jute", "probability": 0.0206 },
    { "crop": "maize", "probability": 0.0021 }
  ],
  "meta": {
    "model_version": 1,
    "state": "Tamil Nadu",
    "district": "Thanjavur"
  }
}
```

### Derivation Rules (No Invented Data)
- `predictedCrop`, `confidence`, `top3Candidates`: Calibrated model probabilities.
- `riskLevel`: Crop attention level (KB) + 1 if confidence < tuned threshold + 1 if $\ge$ 3 conditions deviate.
- `irrigation`, `fertilizer`, `maintenance`: Agronomy KB keyed by crop and growth stage.
- `soilRecommendation`: Input pH vs crop's typical envelope (per-crop stats).
- `weatherPrecautions`, `conditionFlags`, `health status`: Input values vs crop envelope ($\mu \pm 1.5\sigma$).
- `reason`: Plain-language explanation of feature matches.
- `preventiveActions`: Documented crop-specific disease & pest risks from KB.

---

## API Endpoints

### `POST /api/advisory`

```bash
curl -X POST http://localhost:3000/api/advisory \
  -H "Content-Type: application/json" \
  -d '{
    "N": 90,
    "P": 42,
    "K": 43,
    "temperature": 24,
    "humidity": 82,
    "ph": 6.5,
    "rainfall": 202.9,
    "growth_stage": "Flowering / Fruit setting",
    "state": "Tamil Nadu",
    "district": "Thanjavur",
    "soil_type": "Clay",
    "crop": "rice"
  }'
```

#### Responses
- **`200 OK`**: `{ "success": true, "advisory": { ... } }`
- **`400 Bad Request`**: `{ "success": false, "error": "Validation failed.", "details": [...] }`
- **`503 Service Unavailable`**: Model engine unavailable (auto-restarts on next request)
- **`500 Internal Error`**: Prediction failed (generic, zero internal tracebacks exposed)

### `GET /api/advisory/health`
- Returns `{ "status": "ok", "model": "loaded" }`

---

## Running Locally

```bash
# 1) Python Environment
cd ml
pip install -r requirements.txt

# 2) Model Training & Evaluation (Artifacts already generated in saved_models/)
python train_model.py       # CV → Calibration → Thresholds → Test Eval → Saves Artifacts
python evaluate_model.py    # Re-check saved model on held-out test split
python predict.py           # CLI demo through same code path as API

# 3) Node Demo Server (From project root)
npm install
node demo/server.js         # Starts demo server at http://localhost:3001
```

---

## Retraining Instructions

1. Replace `crop_recommendation.csv` keeping required columns (`N`, `P`, `K`, `temperature`, `humidity`, `ph`, `rainfall`, `label`).
2. Adjust `FEATURES` and `VALID_RANGES` in `preprocess.py` if columns differ.
3. Run `python ml/train_model.py` and restart the Node server (worker automatically loads the new pipeline at startup).

---

## Honesty & Production Deployment Notes

- **99.3% Test Accuracy**: Reflects in-distribution benchmark performance where crop clusters are well-separated. Real-world field data will differ; low-confidence predictions are flagged as *provisional* rather than presented with false certainty.
- **Decision Support**: The dataset encodes static seasonal profiles rather than live time-series telemetry. The model acts as decision support for farmers.
- **Context Handling**: `crop`, `state`, and `district` are accepted as contextual metadata; model classification strictly uses the 7 numeric soil and weather parameters.
