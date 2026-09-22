"""
Phoenix AI – Smart Agriculture Platform
Preprocessing module for the Crop Advisory ML pipeline.

Responsibilities
----------------
1. Define the feature set, target column and valid agronomic ranges.
2. Provide a scikit-learn transformer (FeaturePrep) that:
   - enforces the exact feature order the model was trained with,
   - coerces values to numeric floats,
   - imputes missing values with medians LEARNED AT FIT TIME (stored inside
     the saved pipeline, so live inputs receive the exact same treatment).
3. Build the final sklearn Pipeline (preprocessing + classifier) that gets
   serialised and loaded by the backend at prediction time.

IMPORTANT: the same pipeline object is used for training AND for live
prediction, which guarantees there is no train/serve skew.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

# ---------------------------------------------------------------------------
# Feature / target contract
# ---------------------------------------------------------------------------
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET = "label"

# Agronomic sanity bounds. Slightly wider than the training distribution so
# that realistic field values are never wrongly rejected, but impossible
# values (negative rainfall, pH 14, ...) are caught during validation.
VALID_RANGES = {
    "N": (0.0, 200.0),          # kg/ha equivalent index
    "P": (0.0, 200.0),
    "K": (0.0, 300.0),
    "temperature": (5.0, 50.0), # degrees Celsius
    "humidity": (5.0, 100.0),   # relative humidity %
    "ph": (3.0, 10.0),          # soil pH
    "rainfall": (0.0, 800.0),   # mm (seasonal / reference value)
}


class FeaturePrep(BaseEstimator, TransformerMixin):
    """
    Column-order enforcement + numeric coercion + median imputation.

    The imputer medians are computed on the TRAINING data only and are
    serialised together with the pipeline, so the transform step behaves
    identically for training rows and for live user inputs.
    """

    def __init__(self):
        self.imputer_ = None
        self.feature_order_ = None

    def fit(self, X, y=None):
        df = pd.DataFrame(X)
        missing_cols = [c for c in FEATURES if c not in df.columns]
        if missing_cols:
            raise ValueError(
                f"Training data is missing required feature column(s): {missing_cols}"
            )
        self.feature_order_ = list(FEATURES)
        numeric = df[self.feature_order_].apply(pd.to_numeric, errors="coerce")
        self.imputer_ = SimpleImputer(strategy="median")
        self.imputer_.fit(numeric)
        return self

    def transform(self, X):
        df = pd.DataFrame(X)
        ordered = df[self.feature_order_].apply(pd.to_numeric, errors="coerce")
        imputed = self.imputer_.transform(ordered)
        return pd.DataFrame(imputed, columns=self.feature_order_).astype("float32")


def build_pipeline(classifier) -> Pipeline:
    """Wrap a classifier with the Phoenix AI preprocessing step."""
    return Pipeline(
        steps=[
            ("prepare", FeaturePrep()),
            ("model", classifier),
        ]
    )


def feature_vector_from_dict(values: dict) -> pd.DataFrame:
    """Build a single-row DataFrame in the exact feature order the model expects."""
    return pd.DataFrame([[values.get(f) for f in FEATURES]], columns=FEATURES)
