"""
Phoenix AI – Crop advisory prediction service (Python side).

Loads the serialised sklearn pipeline + metadata + per-crop statistics once,
then generates explainable advisory output for a farmer's field inputs.

Every returned field is derived from:
  - the trained model's calibrated probabilities,
  - the live input values compared against per-crop reference statistics,
  - the agronomy knowledge base (agronomy.py / knowledge_base.py).

CLI demo:
    python ml/predict.py

Python API:
    from predict import AdvisoryService
    svc = AdvisoryService.load("ml/saved_models")
    result = svc.predict({"N": 90, "P": 42, "K": 43, "temperature": 24,
                          "humidity": 82, "ph": 6.5, "rainfall": 200,
                          "growth_stage": "Flowering", "state": "Tamil Nadu",
                          "district": "Chennai", "soil_type": "Clay"})
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import joblib
import numpy as np
import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL_DIR = os.path.join(BASE, "ml", "saved_models")

sys.path.insert(0, BASE)
try:
    from agronomy import (
        _FERTILIZER,
        _IRRIGATION,
        _MAINTENANCE,
        GROWTH_STAGES,
        get_crop,
        stage_index,
    )
except ImportError:
    from knowledge_base import (
        _FERTILIZER,
        _IRRIGATION,
        _MAINTENANCE,
        GROWTH_STAGES,
        get_crop,
        stage_index,
    )

try:
    from preprocessing import FEATURES, VALID_RANGES, feature_vector_from_dict
except ImportError:
    from preprocess import FEATURES, VALID_RANGES, feature_vector_from_dict


class InputValidationError(ValueError):
    """Raised when a live input fails validation."""


class AdvisoryService:
    """Loads model artifacts once and serves predictions."""

    def __init__(self, pipeline, metadata: dict, stats: dict):
        self.pipeline = pipeline
        self.metadata = metadata
        self.stats = stats
        self.labels = metadata["labels"]
        self.low_conf_thr = float(metadata.get("low_confidence_threshold", 0.5))

    # -- loading ----------------------------------------------------------
    @classmethod
    def load(cls, model_dir: str = DEFAULT_MODEL_DIR) -> "AdvisoryService":
        pipeline_path = os.path.join(model_dir, "crop_advisory_pipeline.pkl")
        meta_path = os.path.join(model_dir, "crop_advisory_metadata.json")
        stats_path = os.path.join(model_dir, "crop_stats.json")
        if not os.path.exists(pipeline_path):
            raise FileNotFoundError(
                "Model artifact not found. Run `python ml/train_model.py` first."
            )
        pipeline = joblib.load(pipeline_path)
        with open(meta_path, encoding="utf-8") as f:
            metadata = json.load(f)
        stats = {}
        if os.path.exists(stats_path):
            with open(stats_path, encoding="utf-8") as f:
                stats = json.load(f)
        return cls(pipeline, metadata, stats)

    # -- input validation ---------------------------------------------------
    @staticmethod
    def validate(payload: dict) -> dict:
        """Validate a raw user payload; return a clean numeric feature dict."""
        cleaned = {}
        for feat in FEATURES:
            raw = payload.get(feat)
            if raw is None or (isinstance(raw, str) and raw.strip() == ""):
                raise InputValidationError(f"Missing required field: '{feat}'.")
            try:
                value = float(raw)
            except (TypeError, ValueError):
                raise InputValidationError(f"Field '{feat}' must be a number.")
            lo, hi = VALID_RANGES[feat]
            if not (lo <= value <= hi):
                raise InputValidationError(
                    f"Field '{feat}' = {value} is out of range ({lo}–{hi})."
                )
            cleaned[feat] = value
        return cleaned

    # -- explanation helpers ------------------------------------------------
    def _envelope(self, crop: str, feat: str) -> tuple[float, float]:
        s = self.stats.get(crop, {}).get(feat)
        if not s:
            return (-np.inf, np.inf)
        m, sd = s["mean"], s["std"]
        return (m - 1.5 * sd, m + 1.5 * sd)

    def _flag(self, crop: str, feat: str, value: float) -> str | None:
        """Return a human-readable flag when a value leaves the crop envelope."""
        lo, hi = self._envelope(crop, feat)
        names = {
            "temperature": ("temperature", "°C"),
            "humidity": ("humidity", "%"),
            "ph": ("soil pH", ""),
            "rainfall": ("rainfall", " mm"),
        }
        label, unit = names[feat]
        if value < lo:
            return f"{label} {value:.1f}{unit} is below the typical range for this crop ({lo:.1f}–{hi:.1f}{unit})."
        if value > hi:
            return f"{label} {value:.1f}{unit} is above the typical range for this crop ({lo:.1f}–{hi:.1f}{unit})."
        return None

    # -- prediction ----------------------------------------------------------
    def predict(self, payload: dict) -> dict:
        """Full advisory generation from a validated payload."""
        values = self.validate(payload)
        X = feature_vector_from_dict(values)

        proba = self.pipeline.predict_proba(X)[0]
        classes = np.asarray(self.pipeline.classes_)
        order = np.argsort(proba)[::-1]
        top_crop = str(classes[order[0]])
        confidence = float(proba[order[0]])
        top3 = [
            {"crop": str(classes[i]), "probability": round(float(proba[i]), 4)}
            for i in order[:3]
        ]

        stage = str(payload.get("growth_stage") or "Vegetative growth")
        si = stage_index(stage)
        stage_name = GROWTH_STAGES[si]
        state = payload.get("state") or "your state"
        district = payload.get("district") or "your district"
        soil_type = payload.get("soil_type") or "not specified"

        kb = get_crop(top_crop)
        flags: list[str] = []
        for feat in ("temperature", "humidity", "ph", "rainfall"):
            f = self._flag(top_crop, feat, values[feat])
            if f:
                flags.append(f)

        # nutrient-level checks using dataset terciles
        nut_flags = []
        terc = self.stats.get("_nutrient_terciles", {})
        n_name = {"N": "nitrogen", "P": "phosphorus", "K": "potassium"}
        for feat, label in n_name.items():
            t = terc.get(feat)
            if t and values[feat] < t["low"]:
                nut_flags.append(f"soil {label} ({values[feat]:.0f}) is on the lower side")

        # ---- risk level ----------------------------------------------------
        attention = kb["attention"]  # 1 low, 2 medium, 3 high
        risk = attention
        if confidence < self.low_conf_thr:
            risk += 1  # model itself is unsure → escalate
        if len(flags) >= 3:
            risk += 1  # several conditions outside the crop's envelope
        risk = min(risk, 3)
        risk_label = {1: "Low", 2: "Medium", 3: "High"}[risk]

        low_confidence = confidence < self.low_conf_thr
        low_conf_note = (
            "The model's confidence for this prediction is low – verify with local extension advice."
            if low_confidence else None
        )

        # ---- recommendations -------------------------------------------------
        moisture = kb["moisture_need"]
        irrigation = _IRRIGATION[moisture][si]
        fertilizer = _FERTILIZER[kb["nutrient"]][si]
        maintenance = _MAINTENANCE[si]

        ph = values["ph"]
        s = self.stats.get(top_crop, {}).get("ph", {})
        ph_lo, ph_hi = (s["mean"] - 1.5 * s["std"], s["mean"] + 1.5 * s["std"]) if s else (6.0, 7.5)
        if ph < ph_lo:
            soil_rec = (
                f"Soil pH {ph:.1f} is below the ideal range for {top_crop} ({ph_lo:.1f}–{ph_hi:.1f}). "
                "Apply agricultural lime to raise pH before the next season and re-test the soil."
            )
        elif ph > ph_hi:
            soil_rec = (
                f"Soil pH {ph:.1f} is above the ideal range for {top_crop} ({ph_lo:.1f}–{ph_hi:.1f}). "
                "Apply gypsum or elemental sulphur to lower pH gradually and re-test the soil."
            )
        else:
            soil_rec = (
                f"Soil pH {ph:.1f} is within the ideal range for {top_crop}. "
                "Maintain it with organic matter and a soil test every season."
            )
        if nut_flags:
            soil_rec += " Note: " + "; ".join(nut_flags) + "."

        # weather precautions
        weather_precautions = []
        for f in flags:
            if "temperature" in f and "below" in f:
                weather_precautions.append(
                    "Cool weather may slow crop growth – delay irrigation to avoid chilling the soil."
                )
            if "temperature" in f and "above" in f:
                weather_precautions.append(
                    "Heat stress possible – irrigate in the early morning and mulch to keep roots cool."
                )
            if "humidity" in f and "above" in f:
                weather_precautions.append(
                    "High humidity raises fungal disease pressure – improve air flow and scout leaves weekly."
                )
            if "rainfall" in f and "above" in f:
                weather_precautions.append(
                    "High rainfall is expected – ensure field drainage channels are clear."
                )
            if "rainfall" in f and "below" in f:
                weather_precautions.append(
                    "Rainfall is below the crop's typical range – plan deficit irrigation."
                )
        if not weather_precautions:
            weather_precautions.append(
                "Weather conditions are within the expected range for this crop – continue routine monitoring."
            )

        # preventive actions (crop-specific, always relevant)
        preventive = list(kb["disease_notes"])
        if risk == 3 and attention >= 2:
            preventive.append("Escalate monitoring: scout the field twice a week during this stage.")

        # ---- human-readable reason -------------------------------------------
        inside = []
        for feat, label, unit in (
            ("temperature", "temperature", "°C"),
            ("humidity", "humidity", "%"),
            ("ph", "soil pH", ""),
            ("rainfall", "rainfall", " mm"),
        ):
            if self._flag(top_crop, feat, values[feat]) is None:
                inside.append(f"{label} {values[feat]:.1f}{unit}")
        reason = (
            f"The trained model matched your field profile to {top_crop} with {confidence:.0%} confidence"
        )
        if inside:
            reason += ", because your inputs fall inside this crop's typical envelope for " + ", ".join(inside)
        reason += "."
        if flags:
            reason += " Deviations noted: " + " ".join(flags)
        if low_confidence:
            reason += (" Because the model's confidence is below the tuned threshold, "
                       "treat this advisory as provisional and confirm with local extension advice.")

        # health status = how far the CURRENT conditions deviate from the
        # crop's typical envelope (independent of the crop's own risk profile)
        if len(flags) == 0:
            health = "Healthy – conditions match the typical profile for this crop"
        elif len(flags) == 1:
            health = "Fair – one condition deviates slightly from the typical range"
        else:
            health = "Needs attention – several conditions are outside the typical range"

        return {
            "predictedCrop": top_crop,
            "confidence": round(confidence, 4),
            "riskLevel": risk_label,
            "lowConfidence": low_confidence,
            "growthStage": stage_name,
            "irrigationRecommendation": irrigation,
            "fertilizerRecommendation": fertilizer,
            "soilRecommendation": soil_rec,
            "maintenanceRecommendation": maintenance,
            "weatherPrecautions": weather_precautions,
            "preventiveActions": preventive,
            "reason": reason,
            "keyInputFactors": inside or ["No input was inside the crop's typical envelope"],
            "conditionFlags": flags,
            "lowConfidenceNote": low_conf_note,
            "cropHealthStatus": health,
            "riskExplanation": (
                f"Risk level combines the crop's known pest/disease attention level "
                f"({['low', 'medium', 'high'][kb['attention'] - 1]}) with model confidence"
                f"{' (below the tuned threshold)' if low_confidence else ''}"
                f"{' and the number of conditions outside the typical range' if len(flags) >= 3 else ''}."
            ),
            "yieldEstimate": {
                "range": kb["yield_q_ac"],
                "unit": "quintals per acre",
                "note": "indicative range based on typical local practice for this crop",
            },
            "cropNote": kb["note"],
            "harvestWindow": kb["harvest_window"],
            "top3Candidates": top3,
            "meta": {
                "model_version": self.metadata.get("model_version"),
                "trained_at_utc": self.metadata.get("trained_at_utc"),
                "state": state,
                "district": district,
                "soil_type": soil_type,
                "data_source": self.metadata.get("data_source"),
            },
        }


def main():
    svc = AdvisoryService.load()
    samples = [
        {"N": 90, "P": 42, "K": 43, "temperature": 24.0, "humidity": 82.0, "ph": 6.5,
         "rainfall": 202.9, "growth_stage": "Flowering / Fruit setting",
         "state": "Tamil Nadu", "district": "Thanjavur", "soil_type": "Clay"},
        {"N": 21, "P": 26, "K": 27, "temperature": 23.6, "humidity": 60.0, "ph": 6.1,
         "rainfall": 60.7, "growth_stage": "Vegetative growth",
         "state": "Maharashtra", "district": "Solapur", "soil_type": "Sandy loam"},
    ]
    for i, s in enumerate(samples, 1):
        print(f"\n{'='*70}\nSample input {i}\n{'='*70}")
        print(json.dumps(s, indent=2))
        out = svc.predict(s)
        print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
