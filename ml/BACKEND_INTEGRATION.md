# Backend Integration Guide

How to connect the trained crop-advisory model to your existing Phoenix AI backend without breaking anything.

---

## File Structure & Placement

| File | Destination in Project |
|---|---|
| `services/mlAdvisoryService.js` / `services/advisoryService.js` | `<backend>/services/advisoryService.js` |
| `routes/advisory.js` | `<backend>/routes/advisory.js` |
| `ml/` (whole folder) | `<project>/ml` (models + python worker) |

---

## 1. Add Route to existing `server.js`

Add these two lines to your `server.js` (keep everything else untouched):

```javascript
const advisoryRouter = require('./routes/advisory');
app.use('/api', advisoryRouter); // Put AFTER your auth middleware if required
```

That is the only change to your `server.js`. Authentication, dashboard, news, and mandi routes remain untouched.

---

## 2. Environment Variables (Optional)

```bash
PHOENIX_ML_DIR=/absolute/path/to/ml    # Default: <project>/ml (resolved automatically)
PHOENIX_PYTHON=python3                 # Default: python3 (or python on Windows)
PHOENIX_ML_TIMEOUT_MS=15000            # Per-request timeout in ms (default: 15s)
```

No extra npm packages are needed — the service uses Node's built-in `child_process` and `readline`. The route file uses `express`, which your backend already has.

---

## 3. Architecture & Execution Flow

1. When the first advisory request arrives, the service spawns:
   `python3 ml/predict_service.py --model-dir ml/saved_models`
2. The Python worker loads the trained model **once** and keeps it in memory.
3. Requests are streamed to the worker as newline-delimited JSON and answered in order. The model is **never** retrained at request time.
4. If the worker crashes or times out, the next request restarts it automatically.
5. No secrets or internal file paths are ever returned to clients.

---

## 4. Endpoints

### `POST /api/advisory`

#### Request Body
All seven numeric fields are required; strings are optional:

```json
{
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
}
```

*Note: `crop` is accepted as context, but the model itself predicts the crop from the seven numeric values (it is a classifier over 22 crops).*

#### Responses
- **Success (`200 OK`)**: `{ "success": true, "advisory": { ... } }`
- **Validation Failure (`400 Bad Request`)**: `{ "success": false, "error": "Validation failed.", "details": [...] }`
- **Service Unavailable (`503 Service Unavailable`)**: Model engine unavailable (retryable)
- **Internal Error (`500 Internal Server Error`)**: Prediction failed

### `GET /api/advisory/health`
- **Success (`200 OK`)**: `{ "status": "ok", "model": "loaded" }`
- **Error (`503 Service Unavailable`)**: `{ "status": "error", "model": "unavailable" }`

---

## 5. Python Environment on the Server

The backend server machine needs the same Python packages used for training:

```bash
pip install -r ml/requirements.txt
```

If you trained on your laptop and deploy to a server, copy the `ml/` folder (including `saved_models/`) as-is.
