"""Uçtan uca: upload → train → aynı pipeline'la predict (kullanıcı isteği).

Doğrular: tahmin tipi/sütun hizalaması, bilinmeyen kategori uyarısı, veri seti
LRU'dan düşse de tahminin çalışması (self-contained model).
"""

from __future__ import annotations

import io
import json

from fastapi.testclient import TestClient

from main import app
from services import storage

client = TestClient(app)


def _make_csv() -> bytes:
    lines = ["age,city,plan,churn"]
    for i in range(80):
        age = 18 + (i % 50)
        city = ["Ist", "Ank", "Izm"][i % 3]
        plan = ["A", "B", "C"][i % 3]
        churn = 1 if (age > 50 or plan == "C") else 0
        lines.append(f"{age},{city},{plan},{churn}")
    return ("\n".join(lines) + "\n").encode()


def _upload() -> str:
    r = client.post(
        "/api/upload",
        files={"file": ("churn.csv", io.BytesIO(_make_csv()), "text/csv")},
    )
    assert r.status_code == 200
    return r.json()["dataset_id"]


def _train(dataset_id: str, target: str, **body) -> dict:
    with client.stream(
        "POST",
        "/api/train",
        json={"dataset_id": dataset_id, "target_column": target, **body},
    ) as r:
        assert r.status_code == 200
        assert "text/event-stream" in r.headers["content-type"]
        final = None
        for line in r.iter_lines():
            if line.startswith("data: "):
                event = json.loads(line[6:])
                if event["stage"] == "done":
                    final = event
        assert final is not None
        return final["detail"]


def test_target_analysis_endpoint():
    dataset_id = _upload()
    r = client.get(f"/api/train/target/{dataset_id}", params={"column": "churn"})
    assert r.status_code == 200
    body = r.json()
    assert body["suggested_problem_type"] == "classification"
    assert body["trainable"] is True


def test_invalid_target_rejected_before_stream():
    dataset_id = _upload()
    # 'age' çok benzersiz değil ama regresyon override'ı olmadan sınıflandırma
    # için uygun; ID benzeri bir sütun yok. Onun yerine tek-değerli bir kolon
    # simüle edemeyiz, bu yüzden geçersiz override'ı test ederiz:
    r = client.post(
        "/api/train",
        json={
            "dataset_id": dataset_id,
            "target_column": "city",
            "problem_type": "regression",
        },
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "INVALID_TARGET"


def test_train_then_predict_alignment_and_types():
    dataset_id = _upload()
    detail = _train(dataset_id, "churn", model_type="random_forest")
    model_id = detail["model_id"]
    assert detail["problem_type"] == "classification"

    # Aynı pipeline ile tahmin — sınıf etiketi string döner, olasılıklar toplam ~1
    r = client.post(
        "/api/predict",
        json={
            "model_id": model_id,
            "features": {"age": 60, "city": "Ist", "plan": "C"},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["prediction"], str)
    assert body["prediction"] in ("0", "1")
    assert abs(sum(body["probabilities"].values()) - 1.0) < 1e-6
    assert body["warnings"] == []


def test_predict_unknown_category_warns():
    dataset_id = _upload()
    model_id = _train(dataset_id, "churn")["model_id"]
    r = client.post(
        "/api/predict",
        json={
            "model_id": model_id,
            "features": {"age": 30, "city": "ZZZ", "plan": "A"},
        },
    )
    assert r.status_code == 200
    assert any("ZZZ" in w for w in r.json()["warnings"])


def test_predict_survives_dataset_eviction():
    dataset_id = _upload()
    model_id = _train(dataset_id, "churn")["model_id"]

    # Kaynak veri setini bellekten düşür (self-contained model çalışmalı).
    storage.clear()

    r = client.post(
        "/api/predict",
        json={
            "model_id": model_id,
            "features": {"age": 25, "city": "Ank", "plan": "B"},
        },
    )
    assert r.status_code == 200
    assert r.json()["prediction"] in ("0", "1")

    # /api/models kaynak verinin düştüğünü bildirir.
    models = client.get("/api/models").json()
    mine = next(m for m in models if m["model_id"] == model_id)
    assert mine["source_dataset_available"] is False


def test_model_not_found():
    r = client.post(
        "/api/predict", json={"model_id": "nope", "features": {}}
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "MODEL_NOT_FOUND"


def test_importance_expand():
    dataset_id = _upload()
    model_id = _train(dataset_id, "churn")["model_id"]
    full = client.get(f"/api/models/{model_id}/importance").json()
    assert full["total"] == len(full["items"])  # limitsiz → hepsi
