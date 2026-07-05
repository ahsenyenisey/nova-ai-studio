"""Eğitim iç mantığı + ortak ranking helper testleri."""

from __future__ import annotations

import numpy as np
import pandas as pd

from services import storage
from services.ranking import select_top
from services.training import train_stream


def test_select_top_ranks_and_counts_hidden():
    names = ["a", "b", "c", "d"]
    scores = [0.1, 0.9, 0.5, 0.3]
    selected, hidden = select_top(names, scores, 2)
    assert selected == ["b", "c"]
    assert hidden == 2


def test_select_top_all_when_limit_exceeds():
    selected, hidden = select_top(["a", "b"], [1.0, 2.0], 5)
    assert selected == ["a", "b"] and hidden == 0


def _run(df: pd.DataFrame, target: str, problem: str, model="random_forest"):
    record = storage.create_dataset("t.csv", "utf-8", df)
    events = list(train_stream(record, target, model, problem))
    assert events[-1]["stage"] == "done", events[-1]
    return events, events[-1]["detail"]


def test_train_classification_metrics_and_importance():
    rng = np.random.default_rng(0)
    n = 120
    df = pd.DataFrame(
        {
            "x1": rng.normal(size=n),
            "x2": rng.normal(size=n),
            "cat": rng.choice(["p", "q"], size=n),
        }
    )
    df["y"] = ((df["x1"] > 0) | (df["cat"] == "p")).astype(int)
    _, detail = _run(df, "y", "classification")

    assert detail["problem_type"] == "classification"
    assert detail["classification"] is not None
    assert detail["regression"] is None
    assert 0.0 <= detail["classification"]["accuracy"] <= 1.0
    # test seti raporlanıyor
    assert detail["n_test"] == 24
    # importance TÜM feature'ları kapsıyor ve ~1'e normalize
    imp = detail["importance"]
    names = {i["name"] for i in imp["items"]}
    assert {"x1", "x2", "cat"} <= names | set()  # top-N zaten hepsi (3 feature)
    total = sum(i["importance"] for i in imp["items"])
    assert abs(total - 1.0) < 1e-6


def test_train_regression_metrics():
    rng = np.random.default_rng(1)
    n = 100
    x = rng.normal(size=n)
    df = pd.DataFrame({"x": x, "noise": rng.normal(size=n), "y": 3 * x + 1})
    _, detail = _run(df, "y", "regression", model="linear")

    assert detail["problem_type"] == "regression"
    assert detail["regression"] is not None
    assert detail["regression"]["r2"] > 0.9  # neredeyse doğrusal
    assert len(detail["regression"]["residuals"]) == detail["n_test"]


def test_train_progress_has_real_stages():
    rng = np.random.default_rng(2)
    df = pd.DataFrame({"x": rng.normal(size=60), "y": rng.integers(0, 2, size=60)})
    events, _ = _run(df, "y", "classification")
    stages = [e["stage"] for e in events]
    for s in ["validate", "split", "preprocess", "train", "evaluate", "done"]:
        assert s in stages
    # ensemble gerçek ağaç ilerlemesi
    tree_events = [e for e in events if e.get("trees_built")]
    assert tree_events and tree_events[-1]["trees_built"] == 200
