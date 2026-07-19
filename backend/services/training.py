"""Model eğitimi: estimator kurma ve gerçek adımlı eğitim jeneratörü.

Aşamalar gerçek işe karşılık gelir (sahte log yok): doğrula → böl → cross-validation
→ (ayar/ön işleme + fit) → değerlendirme → done. Metrikler `metrics.py`'de,
tahmin `prediction.py`'de. Eğitim ve tahmin aynı fit'li Pipeline'ı paylaşır.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone
from typing import Any

from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from models.schemas import FeatureSchemaItem
from services import metrics, models_store, tuning
from services.preprocessing import (
    build_feature_schema,
    build_preprocessor,
    split_feature_types,
)

RANDOM_STATE = 42
TEST_SIZE = 0.2
# Ücretsiz host (512MB RAM) için hafif tutulur; n_jobs=1 → paralel işçi kopyası yok.
N_ESTIMATORS = 100
PROGRESS_STEPS = 10


def build_estimator(model_type: str, problem_type: str) -> Any:
    classification = problem_type == "classification"
    if model_type == "random_forest":
        cls = RandomForestClassifier if classification else RandomForestRegressor
        return cls(n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE, n_jobs=1)
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


def _fit_incremental(
    estimator: Any, x_train: Any, y_train: Any
) -> Iterator[dict[str, Any]]:
    """Ensemble'ı warm_start ile parça parça eğitir (gerçek 'N/M ağaç' ilerlemesi)."""
    is_ensemble = hasattr(estimator, "warm_start") and hasattr(estimator, "n_estimators")
    if not is_ensemble:
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
            0.55 + 0.3 * frac,
            trees_built=built,
            trees_total=N_ESTIMATORS,
        )


def train_stream(
    record: Any,
    target_column: str,
    model_type: str,
    problem_type: str,
    tune: bool = False,
) -> Iterator[dict[str, Any]]:
    """Eğitim akışı. Son olay 'done' model detayını taşır; hatada 'error'."""
    try:
        df = record.df
        feature_cols = [c for c in df.columns if c != target_column]
        numeric, categorical = split_feature_types(df, feature_cols)
        yield _event("validate", "Veri doğrulanıyor", 0.05)

        x = df[feature_cols]
        y = df[target_column]
        if problem_type == "classification":
            y = y.astype(str)

        stratify = None
        if problem_type == "classification" and y.value_counts().min() >= 2:
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

        # Cross-validation (taze pipeline, her fold yeniden fit).
        cv_pipeline = Pipeline([
            ("pre", build_preprocessor(numeric, categorical)),
            ("est", build_estimator(model_type, problem_type)),
        ])
        cv = metrics.cross_validate_score(cv_pipeline, x, y, problem_type)
        yield _event(
            "cv",
            f"Çapraz doğrulama ({cv.folds} kat)" if cv else "Çapraz doğrulama atlandı",
            0.35,
        )

        best_params: dict[str, str] | None = None
        grid = tuning.param_grid(model_type, problem_type) if tune else None
        if grid is not None:
            yield _event(
                "tune",
                f"Hiperparametre ayarı · {tuning.candidate_count(grid)} aday",
                0.4,
            )
            pipeline = Pipeline([
                ("pre", build_preprocessor(numeric, categorical)),
                ("est", build_estimator(model_type, problem_type)),
            ])
            pipeline, best_params = tuning.run_grid_search(
                pipeline, grid, x_train, y_train, problem_type
            )
            preprocessor = pipeline.named_steps["pre"]
            estimator = pipeline.named_steps["est"]
            x_test_t = preprocessor.transform(x_test)
            yield _event("train", "En iyi model eğitildi", 0.85)
        else:
            preprocessor = build_preprocessor(numeric, categorical)
            x_train_t = preprocessor.fit_transform(x_train)
            x_test_t = preprocessor.transform(x_test)
            yield _event("preprocess", "Ön işleme uygulandı", 0.5)
            estimator = build_estimator(model_type, problem_type)
            yield from _fit_incremental(estimator, x_train_t, y_train)
            pipeline = Pipeline([("pre", preprocessor), ("est", estimator)])

        yield _event("evaluate", "Test setinde değerlendiriliyor", 0.9)
        y_pred = estimator.predict(x_test_t)

        classification = regression = None
        residual_std: float | None = None
        if problem_type == "classification":
            labels = [str(c) for c in estimator.classes_]
            y_proba = estimator.predict_proba(x_test_t) if hasattr(
                estimator, "predict_proba"
            ) else None
            m = metrics.classification_metrics(y_test, y_pred, y_proba, labels)
            classification = m
            primary_name, primary_value = "accuracy", m.accuracy
            class_labels: list[str] | None = labels
        else:
            m = metrics.regression_metrics(y_test, y_pred)
            regression = m
            residual_std = m.residual_std
            primary_name, primary_value = "r2", m.r2
            class_labels = None

        importances = metrics.aggregate_importances(
            preprocessor, metrics.raw_importances(estimator), feature_cols
        )
        perm_importances = metrics.permutation_importances(
            estimator, x_test_t, y_test, preprocessor, feature_cols
        )
        feature_schema = [
            FeatureSchemaItem(**item)  # type: ignore[arg-type]
            for item in build_feature_schema(df, feature_cols)
        ]

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
            permutation_importances=perm_importances,
            n_train=len(x_train),
            n_test=len(x_test),
            primary_metric_name=primary_name,
            primary_metric_value=float(primary_value),
            classification=classification,
            regression=regression,
            class_labels=class_labels,
            cv=cv,
            best_params=best_params,
            residual_std=residual_std,
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
