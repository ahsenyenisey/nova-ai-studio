"""Hiperparametre ayarı: model tipine göre küçük grid + GridSearchCV.

Ayar açıkken final model, train setinde çapraz-doğrulamalı grid aramasının en
iyi adayıdır. Linear regresyonda anlamlı hiperparametre yok → ayar atlanır.
"""

from __future__ import annotations

from math import prod
from typing import Any

import pandas as pd
from sklearn.model_selection import GridSearchCV

CV_FOLDS = 3


def param_grid(model_type: str, problem_type: str) -> dict[str, list[Any]] | None:
    """Pipeline parametre adları `est__*` (estimator adımı). Grid'ler ücretsiz
    host'un bellek/CPU sınırına göre küçük tutulur."""
    if model_type == "random_forest":
        return {"est__n_estimators": [100], "est__max_depth": [None, 10]}
    if model_type == "gradient_boosting":
        return {"est__n_estimators": [100], "est__learning_rate": [0.05, 0.1]}
    if model_type == "linear" and problem_type == "classification":
        return {"est__C": [0.1, 1.0, 10.0]}
    return None  # linear regresyon: ayar yok


def candidate_count(grid: dict[str, list[Any]]) -> int:
    return prod(len(v) for v in grid.values())


def run_grid_search(
    pipeline: Any,
    grid: dict[str, list[Any]],
    x_train: pd.DataFrame,
    y_train: pd.Series,
    problem_type: str,
) -> tuple[Any, dict[str, str]]:
    """En iyi (fit'li) pipeline'ı ve okunur en iyi parametreleri döner."""
    scoring = "accuracy" if problem_type == "classification" else "r2"
    search = GridSearchCV(pipeline, grid, cv=CV_FOLDS, scoring=scoring, n_jobs=1)
    search.fit(x_train, y_train)
    best = {k.replace("est__", ""): str(v) for k, v in search.best_params_.items()}
    return search.best_estimator_, best
