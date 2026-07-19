"""Tahmin: saklı (fit'li) Pipeline ile tekil ve toplu tahmin.

Eğitim ile AYNI pipeline'ı kullanır (tek kaynak). Regresyonda residual std'den
~%95 güven aralığı üretir; bilinmeyen kategoriler warnings ile bildirilir.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from models.schemas import (
    BatchPredictResponse,
    PredictionInterval,
    PredictResponse,
)
from services.errors import missing_features

PREDICTION_COL = "tahmin"
CONFIDENCE_COL = "güven"
LOW_COL = "alt"
HIGH_COL = "üst"
Z_95 = 1.96
_UNKNOWN_SHOWN = 5


def _interval(pred: float, std: float | None) -> PredictionInterval | None:
    if std is None or std <= 0:
        return None
    return PredictionInterval(low=pred - Z_95 * std, high=pred + Z_95 * std)


def run_prediction(record: Any, features: dict[str, Any]) -> PredictResponse:
    """Tekil tahmin. Bilinmeyen kategori → warnings; regresyon → güven aralığı."""
    warnings: list[str] = []
    row: dict[str, Any] = {}
    for f in record.feature_schema:
        value = features.get(f.name)
        if f.type == "numeric":
            row[f.name] = (
                pd.to_numeric(value, errors="coerce") if value is not None else np.nan
            )
        else:
            if value is None:
                row[f.name] = np.nan
            else:
                sv = str(value)
                row[f.name] = sv
                if f.categories is not None and sv not in f.categories:
                    warnings.append(
                        f"'{f.name}' için eğitimde görülmemiş değer: '{sv}'"
                    )

    columns = [f.name for f in record.feature_schema]
    x = pd.DataFrame([row], columns=columns)
    pipeline: Pipeline = record.pipeline
    pred = pipeline.predict(x)[0]

    if record.problem_type == "classification":
        probabilities = None
        confidence = None
        estimator = pipeline.named_steps["est"]
        if hasattr(estimator, "predict_proba"):
            proba = pipeline.predict_proba(x)[0]
            labels = record.class_labels or [str(c) for c in estimator.classes_]
            probabilities = {lbl: float(p) for lbl, p in zip(labels, proba)}
            confidence = float(max(proba))
        return PredictResponse(
            model_id=record.model_id,
            problem_type="classification",
            prediction=str(pred),
            probabilities=probabilities,
            confidence=confidence,
            warnings=warnings,
        )

    value = float(pred)
    return PredictResponse(
        model_id=record.model_id,
        problem_type="regression",
        prediction=value,
        interval=_interval(value, getattr(record, "residual_std", None)),
        warnings=warnings,
    )


def _jsonify(value: Any) -> str | float | None:
    if value is None or (not isinstance(value, str) and pd.isna(value)):
        return None
    if isinstance(value, (int, float, np.integer, np.floating)):
        return float(value)
    return str(value)


def run_batch_prediction(record: Any, df: pd.DataFrame) -> BatchPredictResponse:
    """Toplu tahmin. Eksik feature sütunu → MISSING_FEATURES. Sınıflandırmada
    güven, regresyonda güven aralığı (alt/üst) sütunları eklenir."""
    feature_cols = [f.name for f in record.feature_schema]
    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        raise missing_features(missing)

    warnings: list[str] = []
    x = pd.DataFrame(index=df.index)
    for f in record.feature_schema:
        col = df[f.name]
        if f.type == "numeric":
            x[f.name] = pd.to_numeric(col, errors="coerce")
        else:
            x[f.name] = col  # object/NaN olduğu gibi (eğitimdeki hizayla aynı)
            if f.categories is not None:
                known = set(f.categories)
                unknown = sorted(
                    {str(v) for v in col.dropna().unique() if str(v) not in known}
                )
                if unknown:
                    shown = ", ".join(unknown[:_UNKNOWN_SHOWN])
                    extra = "…" if len(unknown) > _UNKNOWN_SHOWN else ""
                    warnings.append(
                        f"'{f.name}' için eğitimde görülmemiş değer(ler): {shown}{extra}"
                    )

    pipeline: Pipeline = record.pipeline
    preds = pipeline.predict(x[feature_cols])

    is_classification = record.problem_type == "classification"
    confidences: list[float] | None = None
    estimator = pipeline.named_steps["est"]
    if is_classification and hasattr(estimator, "predict_proba"):
        proba = pipeline.predict_proba(x[feature_cols])
        confidences = [float(p.max()) for p in proba]

    std = None if is_classification else getattr(record, "residual_std", None)
    has_interval = std is not None and std > 0

    columns = list(df.columns) + [PREDICTION_COL]
    if confidences is not None:
        columns.append(CONFIDENCE_COL)
    if has_interval:
        columns += [LOW_COL, HIGH_COL]

    base_records = df.to_dict(orient="records")
    rows: list[dict[str, str | float | None]] = []
    for i, base in enumerate(base_records):
        row: dict[str, str | float | None] = {
            str(k): _jsonify(v) for k, v in base.items()
        }
        row[PREDICTION_COL] = str(preds[i]) if is_classification else float(preds[i])
        if confidences is not None:
            row[CONFIDENCE_COL] = round(confidences[i], 4)
        if has_interval:
            row[LOW_COL] = round(float(preds[i]) - Z_95 * std, 4)
            row[HIGH_COL] = round(float(preds[i]) + Z_95 * std, 4)
        rows.append(row)

    return BatchPredictResponse(
        model_id=record.model_id,
        problem_type=record.problem_type,
        prediction_column=PREDICTION_COL,
        columns=columns,
        rows=rows,
        n_rows=len(rows),
        warnings=warnings,
    )
