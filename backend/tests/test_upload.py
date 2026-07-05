"""Upload + EDA endpoint entegrasyon testleri (TestClient)."""

from __future__ import annotations

import io

from fastapi.testclient import TestClient

from main import app
from services.errors import MAX_UPLOAD_BYTES

client = TestClient(app)

GOOD_CSV = b"age,city,score\n30,Istanbul,4.5\n25,Ankara,3.1\n40,Istanbul,\n"


def _upload(content: bytes, name: str = "data.csv"):
    return client.post(
        "/api/upload",
        files={"file": (name, io.BytesIO(content), "text/csv")},
    )


def test_upload_good_returns_summary():
    r = _upload(GOOD_CSV)
    assert r.status_code == 200
    body = r.json()
    assert body["encoding"] == "utf-8"
    assert body["n_rows"] == 3
    assert body["n_cols"] == 3
    assert [c["name"] for c in body["columns"]] == ["age", "city", "score"]
    assert len(body["preview"]) == 3


def test_upload_header_only_empty():
    r = _upload(b"a,b,c\n")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "EMPTY_FILE"


def test_upload_invalid_encoding():
    raw = bytes([0x81, 0x8D, 0x8E, 0x8F, 0x90] * 40)
    r = _upload(raw, name="garbage.csv")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "INVALID_ENCODING"


def test_upload_too_large():
    payload = b"x" * (MAX_UPLOAD_BYTES + 2 * 1024 * 1024)
    r = _upload(payload, name="big.csv")
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_upload_single_column_then_eda_no_correlation():
    r = _upload(b"only\n1\n2\n3\n", name="single.csv")
    assert r.status_code == 200
    dataset_id = r.json()["dataset_id"]

    e = client.get(f"/api/eda/{dataset_id}")
    assert e.status_code == 200
    charts = e.json()["charts"]
    assert charts["correlation_available"] is False
    assert charts["total_numeric"] == 1


def test_eda_full_response():
    dataset_id = _upload(GOOD_CSV).json()["dataset_id"]
    e = client.get(f"/api/eda/{dataset_id}")
    assert e.status_code == 200
    body = e.json()
    names = [s["name"] for s in body["column_stats"]]
    assert names == ["age", "city", "score"]
    missing = {m["name"]: m["missing_ratio"] for m in body["missing_map"]}
    assert round(missing["score"], 3) == 0.333


def test_eda_not_found():
    r = client.get("/api/eda/does-not-exist")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "DATASET_NOT_FOUND"


def test_eda_columns_include_subset():
    csv = b"a,b,c\n1,2,3\n4,5,6\n7,8,9\n"
    dataset_id = _upload(csv).json()["dataset_id"]
    r = client.get(f"/api/eda/{dataset_id}/columns", params={"include": "a,b"})
    assert r.status_code == 200
    body = r.json()
    assert body["selected_columns"] == ["a", "b"]
    assert body["hidden_numeric_count"] == 1
