"""Faz 5 uçları: delete, sample-row (+ eviction), importance method, interval."""

from __future__ import annotations

import io
import json

from fastapi.testclient import TestClient

from main import app
from services import storage

client = TestClient(app)


def _train_classification() -> str:
    lines = ["age,city,plan,churn"]
    for i in range(90):
        age = 18 + (i % 55)
        city = ["Ist", "Ank", "Izm"][i % 3]
        plan = ["A", "B", "C"][i % 3]
        churn = 1 if (age > 55 or plan == "C") else 0
        lines.append(f"{age},{city},{plan},{churn}")
    csv = ("\n".join(lines) + "\n").encode()
    did = client.post(
        "/api/upload", files={"file": ("c.csv", io.BytesIO(csv), "text/csv")}
    ).json()["dataset_id"]
    with client.stream(
        "POST", "/api/train", json={"dataset_id": did, "target_column": "churn"}
    ) as r:
        for line in r.iter_lines():
            if line.startswith("data: "):
                e = json.loads(line[6:])
                if e["stage"] == "done":
                    return e["model_id"]
    return ""


def _train_regression() -> str:
    lines = ["x,noise,y"]
    for i in range(80):
        lines.append(f"{i},{i % 5},{2 * i + 3}")
    csv = ("\n".join(lines) + "\n").encode()
    did = client.post(
        "/api/upload", files={"file": ("r.csv", io.BytesIO(csv), "text/csv")}
    ).json()["dataset_id"]
    with client.stream(
        "POST",
        "/api/train",
        json={"dataset_id": did, "target_column": "y", "model_type": "linear"},
    ) as r:
        for line in r.iter_lines():
            if line.startswith("data: "):
                e = json.loads(line[6:])
                if e["stage"] == "done":
                    return e["model_id"]
    return ""


def test_delete_model():
    model_id = _train_classification()
    assert client.delete(f"/api/models/{model_id}").status_code == 204
    assert client.get(f"/api/models/{model_id}").status_code == 404


def test_sample_row_returns_feature_values():
    model_id = _train_classification()
    r = client.get(f"/api/models/{model_id}/sample-row")
    assert r.status_code == 200
    values = r.json()["values"]
    assert set(values.keys()) == {"age", "city", "plan"}


def test_sample_row_evicted():
    model_id = _train_classification()
    storage.clear()  # kaynak veriyi düşür
    r = client.get(f"/api/models/{model_id}/sample-row")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "MODEL_DATASET_EVICTED"


def test_importance_permutation_method():
    model_id = _train_classification()
    r = client.get(
        f"/api/models/{model_id}/importance", params={"method": "permutation"}
    )
    assert r.status_code == 200
    body = r.json()
    assert {i["name"] for i in body["items"]} == {"age", "city", "plan"}


def test_model_has_cv_and_auc():
    model_id = _train_classification()
    d = client.get(f"/api/models/{model_id}").json()
    assert d["cv"] is not None and d["cv"]["folds"] >= 2
    assert d["classification"]["auc"] is not None


def test_regression_predict_interval():
    model_id = _train_regression()
    r = client.post(
        "/api/predict", json={"model_id": model_id, "features": {"x": 40, "noise": 2}}
    )
    body = r.json()
    assert body["problem_type"] == "regression"
    assert body["interval"] is not None
    assert body["interval"]["low"] <= body["prediction"] <= body["interval"]["high"]
