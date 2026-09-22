"""
Phoenix AI – Standalone model evaluation script.

Reloads the SAVED artifacts (pipeline + metadata) and re-runs evaluation on a
held-out test split, so results can be reproduced any time after training.

Usage:
    python ml/evaluate_model.py

Prints:
  - candidate-free final metrics (accuracy / precision / recall / F1)
  - classification report
  - confusion matrix summary (top misclassifications)
  - honesty notes
"""

from __future__ import annotations

import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

BASE = os.path.dirname(os.path.abspath(__file__))
DATASET = os.path.join(BASE, "ml", "dataset", "crop_recommendation.csv")
MODEL_DIR = os.path.join(BASE, "ml", "saved_models")
RANDOM_STATE = 42

sys.path.insert(0, BASE)
try:
    from preprocessing import FEATURES, TARGET
except ImportError:
    from preprocess import FEATURES, TARGET


def main() -> None:
    pipe_path = os.path.join(MODEL_DIR, "crop_advisory_pipeline.pkl")
    if not os.path.exists(pipe_path):
        sys.exit("No saved model found – run `python ml/train_model.py` first.")
    pipeline = joblib.load(pipe_path)
    df = pd.read_csv(DATASET)
    X = df[FEATURES].astype("float32")
    y = df[TARGET].astype(str)
    _, X_test, _, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=RANDOM_STATE
    )

    y_pred = pipeline.predict(X_test)
    proba = pipeline.predict_proba(X_test)
    conf = proba.max(axis=1)
    classes = np.asarray(pipeline.classes_)

    print("=" * 70)
    print("Phoenix AI – saved-model evaluation (test split, n = %d)" % len(y_test))
    print("=" * 70)
    print(f"accuracy            : {accuracy_score(y_test, y_pred):.4f}")
    print(f"precision (macro)   : {precision_score(y_test, y_pred, average='macro', zero_division=0):.4f}")
    print(f"recall (macro)      : {recall_score(y_test, y_pred, average='macro', zero_division=0):.4f}")
    print(f"f1 (macro)          : {f1_score(y_test, y_pred, average='macro', zero_division=0):.4f}")
    print(f"f1 (weighted)       : {f1_score(y_test, y_pred, average='weighted', zero_division=0):.4f}")
    print(f"mean confidence     : {conf.mean():.4f}  (min {conf.min():.4f})")
    print()
    print(classification_report(y_test, y_pred, zero_division=0))

    cm = confusion_matrix(y_test, y_pred, labels=classes)
    off = []
    for i, true_crop in enumerate(classes):
        for j, pred_crop in enumerate(classes):
            if i != j and cm[i, j] > 0:
                off.append((cm[i, j], true_crop, pred_crop))
    off.sort(reverse=True)
    if off:
        print("Top confusions (count, true -> predicted):")
        for cnt, t, p in off[:5]:
            print(f"   {cnt}  {t} -> {p}")
    else:
        print("No misclassifications on this test split.")

    print()
    print("Honesty notes:")
    print(" - Metrics are computed on a held-out split of the benchmark dataset")
    print("   (in-distribution). Real field data may behave differently.")
    print(" - The model is decision support, not a replacement for local")
    print("   agronomy advice.")
    print(" - Confidences are sigmoid-calibrated probabilities.")


if __name__ == "__main__":
    main()
