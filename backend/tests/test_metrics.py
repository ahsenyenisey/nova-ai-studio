"""metrics.py: CV, ROC/AUC, residual_std, permutation importance testleri."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from services.metrics import (
    aggregate_importances,
    classification_metrics,
    cross_validate_score,
    permutation_importances,
    regression_metrics,
)
from services.preprocessing import build_preprocessor


def _fit_clf():
    rng = np.random.default_rng(0)
    x = pd.DataFrame(rng.normal(size=(80, 3)), columns=["a", "b", "c"])
    y = ((x["a"] + x["b"]) > 0).astype(int).astype(str)
    clf = RandomForestClassifier(n_estimators=40, random_state=0)
    clf.fit(x.to_numpy(), y)
    return clf, x, y


def test_classification_metrics_roc_and_auc():
    clf, x, y = _fit_clf()
    proba = clf.predict_proba(x.to_numpy())
    pred = clf.predict(x.to_numpy())
    m = classification_metrics(y, pred, proba, list(clf.classes_))
    assert m.auc is not None and 0.0 <= m.auc <= 1.0
    assert m.roc is not None and len(m.roc.points) >= 2
    # ROC eğrisi (0,0)'dan başlayıp (1,1)'e ulaşır (monotonik)
    assert m.roc.points[0].fpr <= m.roc.points[-1].fpr


def test_regression_metrics_residual_std():
    y = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0])
    pred = np.array([1.1, 1.9, 3.2, 3.8, 5.1])
    m = regression_metrics(y, pred)
    assert m.residual_std > 0
    assert m.rmse >= m.mae >= 0


def test_cross_validate_score_classification():
    clf, x, y = _fit_clf()
    cv = cross_validate_score(clf, x.to_numpy(), y, "classification")
    assert cv is not None
    assert cv.folds == 5 and cv.metric == "accuracy"
    assert 0.0 <= cv.mean <= 1.0


def test_permutation_importance_covers_all_features():
    rng = np.random.default_rng(1)
    df = pd.DataFrame(
        {
            "num": rng.normal(size=100),
            "cat": rng.choice(["p", "q"], size=100),
        }
    )
    df["y"] = ((df["num"] > 0) | (df["cat"] == "p")).astype(int).astype(str)
    pre = build_preprocessor(["num"], ["cat"])
    xt = pre.fit_transform(df[["num", "cat"]])
    clf = RandomForestClassifier(n_estimators=40, random_state=0)
    clf.fit(xt, df["y"])
    items = permutation_importances(clf, xt, df["y"], pre, ["num", "cat"])
    names = {it.name for it in items}
    assert names == {"num", "cat"}
    assert abs(sum(it.importance for it in items) - 1.0) < 1e-6


def test_aggregate_importances_normalizes():
    pre = build_preprocessor(["n"], ["c"])
    pre.fit(pd.DataFrame({"n": [1.0, 2.0, 3.0], "c": ["a", "b", "a"]}))
    # n + c(a,b) = 3 sütun
    items = aggregate_importances(pre, np.array([0.5, 0.3, 0.2]), ["n", "c"])
    assert abs(sum(it.importance for it in items) - 1.0) < 1e-6
