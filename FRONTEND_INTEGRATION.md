# Frontend Integration Guide

Connect your AI Crop Advisory page to the real prediction API (`/api/advisory`).

---

## File Structure

| File | Purpose |
|---|---|
| `frontend/js/advisory.js` | Drop-in connector: collects the form, validates, calls the API, renders results, shows toasts |
| `frontend/css/advisory.css` | Phoenix green styles for the result cards, risk badges, confidence bars, and toasts |

---

## 1. Link Files & Initialize Component

```html
<link rel="stylesheet" href="css/advisory.css">
<script src="js/advisory.js"></script>
<script>
  PhoenixAdvisory.init({
    apiUrl: '/api/advisory',        // Backend API route
    formId: 'advisoryForm',         // ID of the form container
    submitBtnId: 'advisorySubmit',  // ID of the submit button
    resultId: 'advisoryResult',     // Target div where results render
  });
</script>
```

---

## 2. Element IDs Contract

### Required Numeric Fields (All 7 required by ML model)

| Input ID | Meaning | Valid Range |
|---|---|---|
| `N` | Soil Nitrogen Index | 0–200 |
| `P` | Soil Phosphorus Index | 0–200 |
| `K` | Soil Potassium Index | 0–300 |
| `temperature` | Temperature (°C) | 5–50 |
| `humidity` | Relative Humidity (%) | 5–100 |
| `ph` | Soil pH | 3–10 |
| `rainfall` | Reference Rainfall (mm) | 0–800 |

### Optional Context Fields (Echoed in meta)
- `growth_stage` (`Sowing / Germination` · `Vegetative growth` · `Flowering / Fruit setting` · `Fruit / Grain development` · `Maturity / Harvest`)
- `state`
- `district`
- `soil_type`
- `crop`

*If custom IDs are used on existing input elements, pass a custom field mapping:*

```javascript
PhoenixAdvisory.init({
  apiUrl: '/api/advisory',
  fields: ['N','P','K','temperature','humidity','ph','rainfall',
           'growth_stage','state','district','soil_type','crop'],
});
```

---

## 3. Result Container Setup

```html
<div id="advisoryResult" style="display:none"></div>
```

The connector renders output directly into this container. Alternatively, invoke rendering manually:
```javascript
PhoenixAdvisory.render({ resultId: 'advisoryResult' }, advisoryResponseJson);
```

---

## 4. Built-in Features & UX Highlights

- **Bottom-Right Toasts**: Automatic alerts for form validation errors, network failures, or success states.
- **Loading State Control**: Disables submit button with an animated *"Analyzing..."* state while processing. Hides stale outputs during loading.
- **Comprehensive Results Rendering**:
  - Predicted Crop Title & Risk Level Badge (`Low` / `Medium` / `High`)
  - Calibrated Confidence Bar (%) & Top-3 Candidates ranking
  - Detail Chips: Location, Soil Type, Growth Stage, Harvest Duration Window, Estimated Yield Range (`quintals/acre`)
  - Overall Crop Health Status
  - Explainable Decision Rationale & Risk Explanation
  - Action Cards: Irrigation, Fertilization, Soil Management (pH correction), Field Maintenance
  - Weather Precautions & Preventive Disease Actions
  - Honesty Note & Dataset Source Attribution

---

## 5. Weather Module Integration (Recommended)

If the application fetches live weather data for a selected state or district, auto-populate the hidden or visible `temperature`, `humidity`, and `rainfall` inputs before submission so recommendations reflect actual real-time weather conditions.
