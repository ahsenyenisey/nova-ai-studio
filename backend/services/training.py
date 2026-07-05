"""Model eğitimi: estimator kurma, gerçek adımlı eğitim jeneratörü, metrikler,
feature importance ve tahmin. Eğitim ve tahmin AYNI fit'li Pipeline'ı paylaşır.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    root_mean_squared_error,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from models.schemas import (
    ClassificationMetrics,
    ConfusionMatrix,
    FeatureImportanceItem,
    FeatureSchemaItem,
    PredictResponse,
    RegressionMetrics,
    ResidualPoint,
)
from services import models_store
from services.preprocessing import (
    build_feature_schema,
    build_preprocessor,
    encoded_to_source,
    split_feature_types,
)

RANDOM_STATE = 42
TEST_SIZE = 0.2
N_ESTIMATORS = 200
PROGRESS_STEPS = 10
MAX_RESIDUALS = 500

_ENSEMBLE = {"random_forest", "gradient_boosting"}


def build_estimator(model_type: str, problem_type: str) -> Any:
    classification = problem_type == "classification"
    if model_type == "random_forest":
        cls = RandomForestClassifier if classification else RandomForestRegressor
        return cls(n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE, n_jobs=-1)
    if model_type == "gradient_boosting":
        cls = (
            GradientBoostingClassifier if classification else GradientBoostingRegressor
        )
        return cls(n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE)
    if model_type == "linear":
        if classification:
            return LogisticRegression(max_iter=1000)
        return LinearRegression()
    raise ValueError(f"Bilinmeyen model_type: {model_type}")


def _event(stage: str, message: str, progress: float, **extra: Any) -> dict[str, Any]:
    return {"stage": stage, "message": message, "progress": round(progress, 3), **extra}


def _aggregate_importances(
    preprocessor: Any, raw: np.ndarray, feature_cols: list[str]
) -> list[FeatureImportanceItem]:
    """One-hot ile genişleyen sütun önemlerini orijinal feature'a toplar ve
    toplamı 1'e normalize edip azalan sırada döner."""
    sources = encoded_to_source(preprocessor)
    totals: dict[str, float] = {c: 0.0 for c in feature_cols}
    for src, val in zip(sources, raw):
        totals[src] += float(abs(val))
    s = sum(totals.values())
    if s > 0:
        totals = {k: v / s for k, v in totals.items()}
    items = [FeatureImportanceItem(name=k, importance=v) for k, v in totals.items()]
    items.sort(key=lambda it: it.importance, reverse=True)
    return items


def _raw_importances(estimator: Any) -> np.ndarray:
    if hasattr(estimator, "feature_importances_"):
        return np.asarray(estimator.feature_importances_, dtype=float)
    # Linear modeller: |coef|; çok sınıflı LogisticRegression'da sınıflar arası ortalama.
    coef = np.asarray(estimator.coef_, dtype=float)
    return np.abs(coef).mean(axis=0) if coef.ndim > 1 else np.abs(coef)


def _classification_metrics(
    y_test: pd.Series, y_pred: np.ndarray, labels: list[str]
) -> ClassificationMetrics:
    matrix = confusion_matrix(y_test, y_pred, labels=labels).tolist()
    return ClassificationMetrics(
        accuracy=float(accuracy_score(y_test, y_pred)),
        f1=float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
        precision=float(
            precision_score(y_test, y_pred, average="weighted", zero_division=0)
        ),
        recall=float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
        class_labels=labels,
        confusion_matrix=ConfusionMatrix(labels=labels, matrix=matrix),
    )


def _regression_metrics(y_test: pd.Series, y_pred: np.ndarray) -> RegressionMetrics:
    actual = y_test.to_numpy(dtype=float)
    residuals = [
        ResidualPoint(actual=float(a), predicted=float(p))
        for a, p in zip(actual[:MAX_RESIDUALS], y_pred[:MAX_RESIDUALS])
    ]
    return RegressionMetrics(
        r2=float(r2_score(y_test, y_pred)),
        mae=float(mean_absolute_error(y_test, y_pred)),
        rmse=float(root_mean_squared_error(y_test, y_pred)),
        residuals=residuals,
    )


def _fit_estimator(
    estimator: Any, x_train: np.ndarray, y_train: pd.Series
) -> Iterator[dict[str, Any]]:
    """Ensemble'ı warm_start ile parça parça eğitir (gerçek 'N/M ağaç' ilerlemesi);
    diğer modeller tek fit. Jeneratör ilerleme olayları yield eder."""
    model_type_ensemble = hasattr(estimator, "warm_start") and hasattr(
        estimator, "n_estimators"
    )
    if not model_type_ensemble:
        estimator.fit(x_train, y_train)
        yield _event("train", "Model eğitiliyor", 0.85)
        return

    estimator.set_params(warm_start=True)
    step = max(1, N_ESTIMATORS // PROGRESS_STEPS)
    built = 0
    while built < N_ESTIMATORS:
        built = min(built + step, N_ESTIMATORS)
        estimator.set_params(n_estimators=built)
        estimator.fit(x_train, y_train)
        frac = built / N_ESTIMATORS
        yield _event(
            "train",
            f"Model eğitiliyor · {built}/{N_ESTIMATORS} ağaç",
            0.4 + 0.45 * frac,
            trees_built=built,
            trees_total=N_ESTIMATORS,
        )


def train_stream(
    record: Any, target_column: str, model_type: str, problem_type: str
) -> Iterator[dict[str, Any]]:
    """Eğitim akışı — her aşama gerçek işe karşılık gelir. Son olay 'done'
    model detayını taşır. Beklenmeyen hatada 'error' olayı yield edilir."""
    try:
        df = record.df
        feature_cols = [c for c in df.columns if c != target_column]
        yield _event("validate", "Veri doğrulanıyor", 0.05)

        x = df[feature_cols]
        y = df[target_column]
        # Sınıflandırmada hedefi string'e sabitle (tutarlı etiketler).
        if problem_type == "classification":
            y = y.astype(str)

        stratify = None
        if problem_type == "classification":
            counts = y.value_counts()
            if counts.min() >= 2:
                stratify = y
        x_train, x_test, y_train, y_test = train_test_split(
            x, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=stratify
        )
        yield _event(
            "split",
            f"Eğitim/test bölündü · {len(x_train)}/{len(x_test)}",
            0.2,
            n_train=len(x_train),
            n_test=len(x_test),
        )

        numeric, categorical = split_feature_types(df, feature_cols)
        preprocessor = build_preprocessor(numeric, categorical)
        x_train_t = preprocessor.fit_transform(x_train)
        x_test_t = preprocessor.transform(x_test)
        yield _event("preprocess", "Ön işleme uygulandı", 0.35)

        estimator = build_estimator(model_type, problem_type)
        yield from _fit_estimator(estimator, x_train_t, y_train)

        yield _event("evaluate", "Test setinde değerlendiriliyor", 0.9)
        y_pred = estimator.predict(x_test_t)

        classification = regression = None
        if problem_type == "classification":
            labels = [str(c) for c in estimator.classes_]
            metrics = _classification_metrics(y_test, y_pred, labels)
            classification = metrics
            primary_name, primary_value = "accuracy", metrics.accuracy
            class_labels: list[str] | None = labels
        else:
            metrics = _regression_metrics(y_test, y_pred)
            regression = metrics
            primary_name, primary_value = "r2", metrics.r2
            class_labels = None

        importances = _aggregate_importances(
            preprocessor, _raw_importances(estimator), feature_cols
        )
        feature_schema = [
            FeatureSchemaItem(**item)  # type: ignore[arg-type]
            for item in build_feature_schema(df, feature_cols)
        ]

        pipeline = Pipeline([("pre", preprocessor), ("est", estimator)])
        model_record = models_store.create_model(
            filename=record.filename,
            dataset_id=record.dataset_id,
            target_column=target_column,
            problem_type=problem_type,
            model_type=model_type,
            created_at=datetime.now(timezone.utc).isoformat(),
            pipeline=pipeline,
            feature_schema=feature_schema,
            importances=importances,
            n_train=len(x_train),
            n_test=len(x_test),
            primary_metric_name=primary_name,
            primary_metric_value=float(primary_value),
            classification=classification,
            regression=regression,
            class_labels=class_labels,
        )

        detail = models_store.build_detail(model_record)
        yield _event(
            "done",
            "Eğitim tamamlandı",
            1.0,
            model_id=model_record.model_id,
            detail=detail.model_dump(),
        )
    except Exception as exc:  # noqa: BLE001 — akış içinde HTTP hatası dönemeyiz
        yield _event("error", f"Eğitim sırasında hata: {exc}", 1.0)


def run_prediction(record: Any, features: dict[str, Any]) -> PredictResponse:
    """Saklı pipeline ile tekil tahmin. Bilinmeyen kategori → warnings."""
    warnings: list[str] = []
    row: dict[str, Any] = {}
    for f in record.feature_schema:
        value = features.get(f.name)
        if f.type == "numeric":
            row[f.name] = pd.to_numeric(value, errors="coerce") if value is not None else np.nan
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

    return PredictResponse(
        model_id=record.model_id,
        problem_type="regression",
        prediction=float(pred),
        probabilities=None,
        confidence=None,
        warnings=warnings,
    )
