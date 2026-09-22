"""
Phoenix AI – Crop Advisory ML training module.

Pipeline overview
-----------------
1. Load & validate the dataset (rows/columns, missing, duplicates, ranges).
2. Stratified train/test split (80/20) – no leakage, class-balanced.
3. Cross-validate 4 candidate classifiers on the TRAIN split:
   - RandomForest (ensemble, robust, interpretable via feature importances)
   - ExtraTrees (ensemble, decorrelated trees)
   - GradientBoosting (boosting baseline)
   - DecisionTree (single-tree baseline)
4. Select the best model by mean cross-validated F1-macro (not training accuracy).
5. Calibrate its probabilities (sigmoid) for honest confidence scores.
6. Tune the low-confidence / risk-decision threshold on a held-out tune slice.
7. Final evaluation on the untouched TEST split:
   accuracy, precision/recall/F1 (macro + weighted), confusion matrix,
   per-class report.
8. Serialise the full sklearn Pipeline (preprocessing + calibrated model)
   plus metadata (feature names, ranges, label list, metrics, thresholds).

Usage
-----
    python ml/train_model.py [--dataset path] [--outdir ml/saved_models]

Outputs (ml/saved_models/)
--------------------------
    crop_advisory_pipeline.pkl     sklearn Pipeline used by the backend
    crop_advisory_metadata.json    labels, feature contract, thresholds, metrics
    evaluation_report.md           full evaluation write-up
    plots/confusion_matrix.png
    plots/feature_importance.png
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import ExtraTreesClassifier, GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)

try:
    from preprocessing import FEATURES, TARGET, VALID_RANGES, build_pipeline
except ImportError:
    from preprocess import FEATURES, TARGET, VALID_RANGES, build_pipeline

DEFAULT_DATASET = os.path.join(BASE, "dataset", "crop_recommendation.csv")
DEFAULT_OUTDIR = os.path.join(BASE, "saved_models")
RANDOM_STATE = 42
CV_FOLDS = 5


# ---------------------------------------------------------------------------
# 1. Dataset loading & validation
# ---------------------------------------------------------------------------
def load_and_validate(path: str) -> pd.DataFrame:
    print(f"\n== Step 1: load dataset: {path}")
    if not os.path.exists(path):
        sys.exit(f"Dataset not found at {path}")
    df = pd.read_csv(path)
    print(f"   rows={len(df)}  columns={df.shape[1]}")

    missing = {c: int(df[c].isna().sum()) for c in df.columns if df[c].isna().any()}
    dupes = int(df.duplicated().sum())
    print(f"   missing cells per column: {missing or 'none'}")
    print(f"   duplicate rows: {dupes}")

    for col in FEATURES:
        vals = pd.to_numeric(df[col], errors="coerce")
        bad = int(vals.isna().sum())
        if bad:
            raise ValueError(f"Feature '{col}' has {bad} non-numeric values.")
        vmin, vmax = float(vals.min()), float(vals.max())
        lo, hi = VALID_RANGES[col]
        if vmin < lo or vmax > hi:
            print(f"   NOTE: '{col}' range [{vmin}, {vmax}] extends beyond sanity "
                  f"bounds {VALID_RANGES[col]} (kept – bounds are for live-input validation only).")

    if TARGET not in df.columns:
        raise ValueError(f"Target column '{TARGET}' not found in dataset.")
    print(f"   target classes: {df[TARGET].nunique()}")

    counts = df[TARGET].value_counts()
    print(f"   class balance: min={counts.min()}  max={counts.max()}  "
          f"({'balanced' if counts.min() == counts.max() else 'IMBALANCED'})")
    return df


# ---------------------------------------------------------------------------
# 2. Data split
# ---------------------------------------------------------------------------
def split_data(df: pd.DataFrame):
    print("\n== Step 2: stratified split (80% train / 20% test)")
    X = df[FEATURES].astype("float32")
    y = df[TARGET].astype(str)

    # hold out the untouched final test set
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=RANDOM_STATE
    )
    # from the train split, hold out a small slice used ONLY for threshold tuning
    X_train, X_tune, y_train, y_tune = train_test_split(
        X_train, y_train, test_size=0.15, stratify=y_train, random_state=RANDOM_STATE
    )
    print(f"   train={len(X_train)}  tune={len(X_tune)}  test={len(X_test)}")
    print(f"   class counts preserved in every split (stratified).")
    return X_train, X_tune, X_test, y_train, y_tune, y_test


# ---------------------------------------------------------------------------
# 3. Candidate model cross-validation
# ---------------------------------------------------------------------------
CANDIDATES = {
    "RandomForest": RandomForestClassifier(
        n_estimators=200, max_depth=16, min_samples_leaf=2,
        max_features="sqrt", n_jobs=-1, random_state=RANDOM_STATE,
    ),
    "ExtraTrees": ExtraTreesClassifier(
        n_estimators=300, max_features="sqrt", n_jobs=-1, random_state=RANDOM_STATE,
    ),
    "GradientBoosting": GradientBoostingClassifier(
        n_estimators=200, learning_rate=0.1, max_depth=4,
        subsample=0.9, random_state=RANDOM_STATE,
    ),
    "DecisionTree": DecisionTreeClassifier(
        max_depth=None, min_samples_leaf=2, random_state=RANDOM_STATE,
    ),
}


def cross_validate_candidates(X_train, y_train):
    print("\n== Step 3: 5-fold stratified cross-validation (train split only)")
    skf = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    results = {}
    for name, clf in CANDIDATES.items():
        t0 = time.time()
        scores = cross_val_score(
            build_pipeline(clf), X_train, y_train, cv=skf,
            scoring="f1_macro", n_jobs=-1,
        )
        results[name] = scores
        print(f"   {name:<18} CV F1-macro = {scores.mean():.4f} ± {scores.std():.4f}   ({time.time()-t0:.1f}s)")
    best = max(results, key=lambda k: results[k].mean())
    print(f"   >>> best by CV F1-macro: {best}")
    return results, best


# ---------------------------------------------------------------------------
# 4. Calibration + threshold tuning (on the tune slice only)
# ---------------------------------------------------------------------------
def calibrate_and_tune(best_name, X_train, X_tune, y_train, y_tune):
    print("\n== Step 4: calibrate probabilities + tune risk thresholds")
    base = CANDIDATES[best_name]
    print(f"   training full {best_name} on the train split, then sigmoid calibration…")
    cal = CalibratedClassifierCV(estimator=base, method="sigmoid", cv=3, n_jobs=-1)
    cal.fit(X_train, y_train)
    proba = cal.predict_proba(X_tune)
    classes = np.asarray(cal.classes_)
    pred_idx = proba.argmax(axis=1)
    conf = proba.max(axis=1)

    # Optimal decision threshold
    best_t, best_f1 = 0.55, -1.0
    for t in np.arange(0.05, 0.95, 0.01):
        accepted = conf >= t
        f1 = f1_score(y_tune, classes[pred_idx], average="macro", sample_weight=accepted.astype(float))
        if f1 > best_f1:
            best_t, best_f1 = t, f1
    print(f"   low-confidence threshold (tuned on tune slice): {best_t:.2f}  (accept-F1 {best_f1:.4f})")

    bands = {
        "low": float(np.percentile(conf, 80)),
        "medium": float(np.percentile(conf, 50)),
    }
    print(f"   risk bands → HIGH if conf < {bands['medium']:.2f}, "
          f"MEDIUM if conf < {bands['low']:.2f}, else LOW")
    return cal, classes, float(best_t), bands


# ---------------------------------------------------------------------------
# 5. Final evaluation on the untouched test set
# ---------------------------------------------------------------------------
def evaluate_final(pipeline: Pipeline, classes, low_conf_thr, bands, X_test, y_test, outdir):
    print("\n== Step 5: final evaluation (untouched test split)")
    y_pred = pipeline.predict(X_test)
    proba = pipeline.predict_proba(X_test)
    conf = proba.max(axis=1)

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision_macro": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        "precision_weighted": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
        "recall_weighted": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
        "f1_weighted": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
        "n_test": int(len(y_test)),
    }
    print(f"   accuracy            = {metrics['accuracy']:.4f}")
    print(f"   f1 (macro)          = {metrics['f1_macro']:.4f}")
    print(f"   f1 (weighted)       = {metrics['f1_weighted']:.4f}")
    print(f"   precision (macro)   = {metrics['precision_macro']:.4f}")
    print(f"   recall (macro)      = {metrics['recall_macro']:.4f}")

    report = classification_report(y_test, y_pred, zero_division=0)
    print("\n" + report)

    cm = confusion_matrix(y_test, y_pred, labels=classes)
    flagged = int((conf < low_conf_thr).sum())
    print(f"   low-confidence (flagged for review) share on test: {flagged}/{len(y_test)} "
          f"({flagged/len(y_test):.1%})")

    # ---- plots ----
    plot_dir = os.path.join(outdir, "plots")
    os.makedirs(plot_dir, exist_ok=True)
    plot_confusion(cm, classes, os.path.join(plot_dir, "confusion_matrix.png"))
    model_step = pipeline.named_steps["model"]
    if hasattr(model_step, "calibrated_classifiers_"):
        model_step = model_step.calibrated_classifiers_[0].estimator
    elif hasattr(model_step, "estimator"):
        model_step = model_step.estimator
    plot_feature_importance(model_step, FEATURES, os.path.join(plot_dir, "feature_importance.png"))

    return metrics, report, cm


def plot_confusion(cm: np.ndarray, classes, path: str) -> None:
    n = cm.shape[0]
    fig, ax = plt.subplots(figsize=(max(10, n * 0.45), max(9, n * 0.42)))
    im = ax.imshow(cm, cmap="YlGn")
    ax.set_xticks(range(n)); ax.set_yticks(range(n))
    ax.set_xticklabels(classes, rotation=90, fontsize=7)
    ax.set_yticklabels(classes, fontsize=7)
    for i in range(n):
        for j in range(n):
            ax.text(j, i, cm[i, j], ha="center", va="center", fontsize=6,
                    color="white" if cm[i, j] > cm.max() / 2 else "black")
    ax.set_xlabel("Predicted"); ax.set_ylabel("True")
    ax.set_title("Confusion matrix – final test set")
    fig.colorbar(im, ax=ax, shrink=0.8)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def plot_feature_importance(model, feature_names, path: str) -> None:
    if not hasattr(model, "feature_importances_"):
        return
    importances = model.feature_importances_
    order = np.argsort(importances)[::-1]
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.barh([feature_names[i] for i in order][::-1], importances[order][::-1], color="#2e9e5b")
    ax.set_xlabel("Importance")
    ax.set_title("Feature importances (selected model)")
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


# ---------------------------------------------------------------------------
# 6. Save artifacts
# ---------------------------------------------------------------------------
def save_artifacts(pipeline, classes, features, ranges, metrics, low_conf_thr, bands, outdir, df=None):
    print("\n== Step 6: save trained artifacts")
    os.makedirs(outdir, exist_ok=True)
    pipeline_path = os.path.join(outdir, "crop_advisory_pipeline.pkl")
    meta_path = os.path.join(outdir, "crop_advisory_metadata.json")
    stats_path = os.path.join(outdir, "crop_stats.json")
    joblib.dump(pipeline, pipeline_path)

    stats = {}
    if df is not None:
        g = df.groupby("label")
        for crop, grp in g:
            stats[str(crop)] = {
                c: {"mean": float(grp[c].mean()), "std": float(grp[c].std())}
                for c in ["temperature", "humidity", "ph", "rainfall"]
            }
        stats["_nutrient_terciles"] = {
            c: {"low": float(df[c].quantile(0.33)), "high": float(df[c].quantile(0.66))}
            for c in ["N", "P", "K"]
        }
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    print(f"   crop stats → {stats_path}")

    metadata = {
        "model_version": 1,
        "trained_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "task": "multiclass classification – crop suitability / risk triage",
        "target": TARGET,
        "features": features,
        "valid_ranges": ranges,
        "labels": [str(c) for c in classes],
        "low_confidence_threshold": float(low_conf_thr),
        "risk_bands": {"high_below": bands["medium"], "medium_below": bands["low"], "low_above": bands["low"]},
        "test_metrics": metrics,
        "data_source": "Crop_recommendation.csv – public benchmark (2200 rows, 22 crops)",
        "training_split": "80% train / 20% test (stratified); threshold tuned on 15% of train",
        "random_state": RANDOM_STATE,
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"   pipeline → {pipeline_path}")
    print(f"   metadata → {meta_path}")
    return metadata


def write_report(metadata, cv_results, best_name, report_text, outdir):
    path = os.path.join(outdir, "evaluation_report.md")
    lines = [
        "# Phoenix AI – Crop Advisory Model: Training & Evaluation Report",
        "",
        f"Generated: {metadata['trained_at_utc']}",
        "",
        "## 1. Task",
        "",
        "Multiclass classification (22 crops) over soil + weather features, used as the",
        "engine behind the Phoenix AI crop advisory: the predicted class drives the",
        "agronomy knowledge-base lookup (risk, irrigation, fertiliser, soil, weather",
        "precautions, preventive actions), and the calibrated probability drives the",
        "confidence / risk level shown to the farmer.",
        "",
        "## 2. Dataset",
        "",
        f"- {metadata['data_source']}",
        "- 2,200 rows × 8 columns; 0 missing; 0 duplicates; perfectly balanced (100 rows/crop).",
        "- Features: N, P, K (soil nutrient indices), temperature (°C), humidity (%),",
        "  ph, rainfall (mm). Target: `label`.",
        "",
        "## 3. Candidate models (5-fold stratified CV, F1-macro)",
        "",
        "| model | CV F1-macro (mean ± std) |",
        "|---|---|",
    ]
    for name, scores in cv_results.items():
        lines.append(f"| {name} | {scores.mean():.4f} ± {scores.std():.4f} |")
    lines += [
        "",
        f"**Selected model: {best_name}** (highest cross-validated F1-macro).",
        "The model is then probability-calibrated (sigmoid / Platt scaling) so the",
        "confidence score shown in the UI is meaningful, not just an argmax.",
        "",
        "## 4. Final test-set metrics (held out until the end)",
        "",
        "| metric | value |",
        "|---|---|",
        f"| accuracy | {metadata['test_metrics']['accuracy']:.4f} |",
        f"| precision (macro) | {metadata['test_metrics']['precision_macro']:.4f} |",
        f"| recall (macro) | {metadata['test_metrics']['recall_macro']:.4f} |",
        f"| F1 (macro) | {metadata['test_metrics']['f1_macro']:.4f} |",
        f"| F1 (weighted) | {metadata['test_metrics']['f1_weighted']:.4f} |",
        "",
        "```",
        report_text,
        "```",
        "",
        "## 5. Decision thresholds (tuned on the tune slice)",
        "",
        f"- Low-confidence flag (prediction sent for review): confidence < {metadata['low_confidence_threshold']:.2f}",
        f"- Risk bands: HIGH when confidence < {metadata['risk_bands']['high_below']:.2f}, "
        f"MEDIUM when < {metadata['risk_bands']['medium_below']:.2f}, else LOW.",
        "",
        "## 6. Explanation & honesty notes",
        "",
        "- Predictions come from the trained model; advisory text comes from the agronomy",
        "  knowledge base keyed by the predicted crop, moisture need and growth stage.",
        "- The model was trained on a benchmark dataset, not on live field telemetry;",
        "  treat outputs as decision support and validate with local agronomy practices.",
        "- Evaluation is on a held-out split of the same dataset (in-distribution).",
        "  Performance on out-of-distribution field data will differ.",
        "",
        "## 7. Artifacts",
        "",
        "- `saved_models/crop_advisory_pipeline.pkl` – full preprocessing + calibrated model.",
        "- `saved_models/crop_advisory_metadata.json` – feature contract, labels, thresholds, metrics.",
        "- `saved_models/plots/confusion_matrix.png`, `feature_importance.png`.",
        "",
    ]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"   report → {path}")


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Train the Phoenix AI crop advisory model.")
    ap.add_argument("--dataset", default=DEFAULT_DATASET)
    ap.add_argument("--outdir", default=DEFAULT_OUTDIR)
    args = ap.parse_args()

    t0 = time.time()
    df = load_and_validate(args.dataset)
    X_train, X_tune, X_test, y_train, y_tune, y_test = split_data(df)
    cv_results, best_name = cross_validate_candidates(X_train, y_train)
    cal, classes, low_thr, bands = calibrate_and_tune(best_name, X_train, X_tune, y_train, y_tune)

    # Final model = full pipeline (preprocessing + calibrated winner), fit on train+tune
    X_all = pd.concat([X_train, X_tune]); y_all = pd.concat([y_train, y_tune])
    print("\n   refitting final pipeline on train+tune slices (test remains untouched)…")
    pipeline = build_pipeline(cal)
    pipeline.fit(X_all, y_all)

    metrics, report_text, _ = evaluate_final(pipeline, classes, low_thr, bands, X_test, y_test, args.outdir)
    metadata = save_artifacts(pipeline, classes, FEATURES, VALID_RANGES, metrics, low_thr, bands, args.outdir, df)
    write_report(metadata, cv_results, best_name, report_text, args.outdir)
    print(f"\nDone in {time.time()-t0:.1f}s. Next: run `python ml/predict.py` for a demo prediction.")


if __name__ == "__main__":
    main()
