# Phoenix AI – Crop Advisory Model Training & Evaluation Report

**Generated**: 2026-09-11 10:25:33 UTC

## 1. Executive Summary
- **Selected Classifier**: `RandomForest` (probability calibrated via Sigmoid 3-fold CV)
- **Held-Out Test Accuracy**: **0.9932** (99.32%)
- **Held-Out Test F1-Macro**: **0.9932**
- **Held-Out Test F1-Weighted**: **0.9932**
- **Mean Test Confidence**: **0.9532**

## 2. Cross-Validation Model Comparison
| Candidate Classifier | 5-Fold CV F1-Macro Mean | Std Dev |
|---|---|---|
| RandomForest | 0.9959 | 0.0065 |
| ExtraTrees | 0.9919 | 0.0098 |
| GradientBoosting | 0.9814 | 0.0107 |
| DecisionTree | 0.9899 | 0.0036 |

## 3. Detailed Test Set Classification Report

```
              precision    recall  f1-score   support

       apple       1.00      1.00      1.00        20
      banana       1.00      1.00      1.00        20
   blackgram       1.00      0.95      0.97        20
    chickpea       1.00      1.00      1.00        20
     coconut       1.00      1.00      1.00        20
      coffee       1.00      1.00      1.00        20
      cotton       1.00      1.00      1.00        20
      grapes       1.00      1.00      1.00        20
        jute       0.95      1.00      0.98        20
 kidneybeans       1.00      1.00      1.00        20
      lentil       1.00      0.95      0.97        20
       maize       0.95      1.00      0.98        20
       mango       1.00      1.00      1.00        20
   mothbeans       0.95      1.00      0.98        20
    mungbean       1.00      1.00      1.00        20
   muskmelon       1.00      1.00      1.00        20
      orange       1.00      1.00      1.00        20
      papaya       1.00      1.00      1.00        20
  pigeonpeas       1.00      1.00      1.00        20
 pomegranate       1.00      1.00      1.00        20
        rice       1.00      0.95      0.97        20
  watermelon       1.00      1.00      1.00        20

    accuracy                           0.99       440
   macro avg       0.99      0.99      0.99       440
weighted avg       0.99      0.99      0.99       440

```

## 4. Model Artifacts & Outputs
- `saved_models/crop_advisory_pipeline.pkl`: Serialized Scikit-Learn Pipeline
- `saved_models/crop_advisory_metadata.json`: Feature contracts & metrics
- `saved_models/crop_stats.json`: Per-crop reference envelopes (mean/std)
- `saved_models/plots/confusion_matrix.png`: Confusion Matrix Plot
- `saved_models/plots/feature_importances.png`: Feature Importances Plot

## 5. Deployment & Honesty Notes
- Training & serving use the exact same Pipeline structure to guarantee **zero train/serve skew**.
- High accuracy reflects well-separated crop clusters in the benchmark dataset.
- Low confidence predictions trigger provisional advisory notices for farmers.