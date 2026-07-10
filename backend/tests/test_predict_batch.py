"""Toplu CSV tahmini testleri: hizalama, MISSING_FEATURES, uyarı, reg/sınıf."""

from __future__ import annotations

import io
import json

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _train_classification() -> str:
    lines = ["age,city,plan,churn"]
    for i in range(80):
        age = 18 + (i % 50)
        city = ["Ist", "Ank", "Izm"][i % 3]
        plan = ["A", "B", "C"][i % 3]
        churn = 1 if (age > 50 or plan == "C") else 0
        lines.append(f"{age},{city},{plan},{churn}")
    csv = ("\n".join(lines) + "\n").encode()
    dataset_id = client.post(
        "/api/upload", files={"file": ("t.csv", io.BytesIO(csv), "text/csv")}
    ).json()["dataset_id"]
    with client.stream(
        "POST",
        "/api/train",
        json={"dataset_id": dataset_id, "target_column": "churn"},
    ) as r:
        model_id = ""
        for line in r.iter_lines():
            if line.startswith("data: "):
                e = json.loads(line[6:])
                if e["stage"] == "done":
                    model_id = e["model_id"]
    return model_id


def _batch(model_id: str, csv: bytes):
    return client.post(
        "/api/predict/batch",
        data={"model_id": model_id},
        files={"file": ("in.csv", io.BytesIO(csv), "text/csv")},
    )


def test_batch_predict_appends_prediction_and_confidence():
    model_id = _train_classification()
    csv = b"id,age,city,plan\n1,60,Ist,C\n2,20,Ank,A\n"
    r = _batch(model_id, csv)
    assert r.status_code == 200
    body = r.json()
    assert body["n_rows"] == 2
    assert body["prediction_column"] == "tahmin"
    # orijinal id sütunu korunur + tahmin + güven eklenir
    assert body["columns"] == ["id", "age", "city", "plan", "tahmin", "güven"]
    first = body["rows"][0]
    assert first["id"] == 1.0 and first["tahmin"] in ("0", "1")
    assert 0.0 <= first["güven"] <= 1.0


def test_batch_missing_feature_column():
    model_id = _train_classification()
    # 'plan' eksik
    r = _batch(model_id, b"age,city\n30,Ist\n")
    assert r.status_code == 400
    body = r.json()
    assert body["error"]["code"] == "MISSING_FEATURES"
    assert "plan" in body["error"]["message"]


def test_batch_unknown_category_warns():
    model_id = _train_classification()
    r = _batch(model_id, b"age,city,plan\n30,ZZZ,A\n")
    assert r.status_code == 200
    assert any("ZZZ" in w for w in r.json()["warnings"])


def test_batch_regression_numeric_prediction():
    # basit regresyon modeli
    lines = ["x,noise,y"]
    for i in range(60):
        lines.append(f"{i},{i % 7},{3 * i + 1}")
    csv = ("\n".join(lines) + "\n").encode()
    dataset_id = client.post(
        "/api/upload", files={"file": ("r.csv", io.BytesIO(csv), "text/csv")}
    ).json()["dataset_id"]
    with client.stream(
        "POST",
        "/api/train",
        json={
            "dataset_id": dataset_id,
            "target_column": "y",
            "model_type": "linear",
        },
    ) as resp:
        model_id = ""
        for line in resp.iter_lines():
            if line.startswith("data: "):
                e = json.loads(line[6:])
                if e["stage"] == "done":
                    model_id = e["model_id"]

    r = _batch(model_id, b"x,noise\n10,3\n20,1\n")
    assert r.status_code == 200
    body = r.json()
    assert "güven" not in body["columns"]  # regresyonda güven yok
    assert isinstance(body["rows"][0]["tahmin"], float)
