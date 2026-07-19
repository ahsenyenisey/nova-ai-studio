"""Metrik hesaplamaları: sınıflandırma/regresyon metrikleri, ROC/AUC,
cross-validation, feature importance (model-tabanlı + permutation).

`training.py`'den ayrıldı (CLAUDE.md <300 satır). Tümü saf hesap — yan etkisiz.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    accuracy_score,
    auc as auc_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
    roc_curve,
    root_mean_squared_error,
)
from sklearn.model_selection import KFold, StratifiedKFold, cross_val_score

from models.schemas import (
    ClassificationMetrics,
    ConfusionMatrix,
    CvScore,
    FeatureImportanceItem,
    RegressionMetrics,
    ResidualPoint,
    RocCurve,
    RocPoint,
)
from services.preprocessing import encoded_to_source

MAX_RESIDUALS = 500
ROC_POINTS = 50
PERMUTATION_REPEATS = 3
CV_FOLDS = 5
RANDOM_STATE = 42


# --- Importance -----------------------------------------------------------


def aggregate_importances(
    preprocessor: Any, raw: np.ndarray, feature_cols: list[str]
) -> list[FeatureImportanceItem]:
    """One-hot ile genişleyen sütun önemlerini orijinal feature'a toplar,
    toplamı 1'e normalize eder ve azalan sırada döner."""
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


def raw_importances(estimator: Any) -> np.ndarray:
    if hasattr(estimator, "feature_importances_"):
        return np.asarray(estimator.feature_importances_, dtype=float)
    # Linear modeller: |coef|; çok sınıflı LogisticRegression'da sınıflar arası ortalama.
    coef = np.asarray(estimator.coef_, dtype=float)
    return np.abs(coef).mean(axis=0) if coef.ndim > 1 else np.abs(coef)


def permutation_importances(
    estimator: Any,
    x_test_t: np.ndarray,
    y_test: pd.Series,
    preprocessor: Any,
    feature_cols: list[str],
) -> list[FeatureImportanceItem]:
    """Test setinde permutation importance → orijinal feature'lara toplanır."""
    result = permutation_importance(
        estimator,
        x_test_t,
        y_test,
        n_repeats=PERMUTATION_REPEATS,
        random_state=RANDOM_STATE,
        n_jobs=1,
    )
    return aggregate_importances(preprocessor, result.importances_mean, feature_cols)


# --- Cross-validation -----------------------------------------------------


def cross_validate_score(
    pipeline: Any, x: pd.DataFrame, y: pd.Series, problem_type: str
) -> CvScore | None:
    """Taze pipeline üzerinde k-fold CV (her fold yeniden fit → sızıntı yok)."""
    if problem_type == "classification":
        min_class = int(y.value_counts().min())
        folds = min(CV_FOLDS, min_class)
        if folds < 2:
            return None
        cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=RANDOM_STATE)
        scoring, metric = "accuracy", "accuracy"
    else:
        folds = min(CV_FOLDS, len(x))
        if folds < 2:
            return None
        cv = KFold(n_splits=folds, shuffle=True, random_state=RANDOM_STATE)
        scoring, metric = "r2", "r2"

    scores = cross_val_score(pipeline, x, y, cv=cv, scoring=scoring)
    return CvScore(
        mean=float(scores.mean()),
        std=float(scores.std()),
        folds=folds,
        metric=metric,
    )


# --- Sınıflandırma metrikleri --------------------------------------------


def _roc_data(
    y_test: pd.Series, y_proba: np.ndarray, labels: list[str]
) -> tuple[RocCurve | None, float | None]:
    """İkili: ROC eğrisi + AUC; çok sınıflı: yalnızca macro-OVR AUC."""
    if y_proba is None:
        return None, None
    if len(labels) == 2:
        positive = labels[1]
        y_bin = (y_test.astype(str).to_numpy() == positive).astype(int)
        if y_bin.min() == y_bin.max():  # tek sınıf test setinde → ROC anlamsız
            return None, None
        fpr, tpr, _ = roc_curve(y_bin, y_proba[:, 1])
        idx = np.linspace(0, len(fpr) - 1, min(ROC_POINTS, len(fpr))).astype(int)
        points = [RocPoint(fpr=float(fpr[i]), tpr=float(tpr[i])) for i in idx]
        area = float(auc_score(fpr, tpr))
        return RocCurve(points=points, auc=area, positive_label=positive), area
    try:
        area = float(
            roc_auc_score(y_test, y_proba, multi_class="ovr", average="macro")
        )
        return None, area
    except ValueError:
        return None, None


def classification_metrics(
    y_test: pd.Series, y_pred: np.ndarray, y_proba: np.ndarray | None, labels: list[str]
) -> ClassificationMetrics:
    matrix = confusion_matrix(y_test, y_pred, labels=labels).tolist()
    roc, area = _roc_data(y_test, y_proba, labels)
    return ClassificationMetrics(
        accuracy=float(accuracy_score(y_test, y_pred)),
        f1=float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
        precision=float(
            precision_score(y_test, y_pred, average="weighted", zero_division=0)
        ),
        recall=float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
        class_labels=labels,
        confusion_matrix=ConfusionMatrix(labels=labels, matrix=matrix),
        auc=area,
        roc=roc,
    )


# --- Regresyon metrikleri -------------------------------------------------


def regression_metrics(y_test: pd.Series, y_pred: np.ndarray) -> RegressionMetrics:
    actual = y_test.to_numpy(dtype=float)
    residual_std = float(np.std(actual - y_pred)) if len(actual) else 0.0
    residuals = [
        ResidualPoint(actual=float(a), predicted=float(p))
        for a, p in zip(actual[:MAX_RESIDUALS], y_pred[:MAX_RESIDUALS])
    ]
    return RegressionMetrics(
        r2=float(r2_score(y_test, y_pred)),
        mae=float(mean_absolute_error(y_test, y_pred)),
        rmse=float(root_mean_squared_error(y_test, y_pred)),
        residuals=residuals,
        residual_std=residual_std,
    )
