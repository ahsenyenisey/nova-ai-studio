"""Hiperparametre ayarı testleri."""

from __future__ import annotations

import io
import json

from fastapi.testclient import TestClient

from main import app
from services.tuning import candidate_count, param_grid

client = TestClient(app)


def test_param_grid_per_model():
    assert param_grid("random_forest", "classification") is not None
    assert param_grid("gradient_boosting", "regression") is not None
    assert param_grid("linear", "classification") is not None
    # linear regresyonda ayar yok
    assert param_grid("linear", "regression") is None


def test_candidate_count():
    grid = {"a": [1, 2], "b": [3, 4, 5]}
    assert candidate_count(grid) == 6


def _csv() -> bytes:
    lines = ["age,plan,churn"]
    for i in range(90):
        age = 18 + (i % 55)
        plan = ["A", "B", "C"][i % 3]
        churn = 1 if (age > 55 or plan == "C") else 0
        lines.append(f"{age},{plan},{churn}")
    return ("\n".join(lines) + "\n").encode()


def test_train_with_tune_returns_best_params():
    dataset_id = client.post(
        "/api/upload", files={"file": ("c.csv", io.BytesIO(_csv()), "text/csv")}
    ).json()["dataset_id"]
    detail = None
    stages = []
    with client.stream(
        "POST",
        "/api/train",
        json={
            "dataset_id": dataset_id,
            "target_column": "churn",
            "model_type": "random_forest",
            "tune": True,
        },
    ) as r:
        for line in r.iter_lines():
            if line.startswith("data: "):
                e = json.loads(line[6:])
                stages.append(e["stage"])
                if e["stage"] == "done":
                    detail = e["detail"]
    assert "tune" in stages
    assert detail is not None
    assert detail["best_params"]  # dolu
    assert detail["classification"]["accuracy"] >= 0.0
