"""Model endpoint'leri:
- GET    /api/models                      → model listesi
- GET    /api/models/{id}                 → model detayı
- GET    /api/models/{id}/importance      → önem (model | permutation)
- GET    /api/models/{id}/sample-row      → kaynak veriden örnek satır
- DELETE /api/models/{id}                 → modeli sil
- POST   /api/predict                     → tekil tahmin
- POST   /api/predict/batch               → toplu CSV tahmini
"""

from __future__ import annotations

import random
from typing import Literal

from fastapi import APIRouter, Form, Query, UploadFile

from models.schemas import (
    BatchPredictResponse,
    ErrorResponse,
    ImportanceList,
    ModelDetail,
    ModelSummary,
    PredictRequest,
    PredictResponse,
    SampleRow,
)
from routers.upload import read_limited
from services import models_store, storage
from services.csv_loader import decode_bytes, parse_csv
from services.errors import empty_file, model_dataset_evicted
from services.prediction import run_batch_prediction, run_prediction

router = APIRouter(tags=["models"])


@router.get("/api/models", response_model=list[ModelSummary])
def list_models() -> list[ModelSummary]:
    return models_store.list_models()


@router.get(
    "/api/models/{model_id}",
    response_model=ModelDetail,
    responses={404: {"model": ErrorResponse}},
)
def get_model(model_id: str) -> ModelDetail:
    record = models_store.get_model(model_id)
    return models_store.build_detail(record)


@router.get(
    "/api/models/{model_id}/importance",
    response_model=ImportanceList,
    responses={404: {"model": ErrorResponse}},
)
def get_importance(
    model_id: str,
    limit: int | None = Query(default=None, ge=1),
    method: Literal["model", "permutation"] = Query(default="model"),
) -> ImportanceList:
    record = models_store.get_model(model_id)
    return models_store.build_importance(record, limit, method)


@router.get(
    "/api/models/{model_id}/sample-row",
    response_model=SampleRow,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
def sample_row(model_id: str) -> SampleRow:
    record = models_store.get_model(model_id)
    if not storage.has_dataset(record.dataset_id):
        raise model_dataset_evicted()
    df = storage.get_dataset(record.dataset_id).df
    idx = random.randint(0, len(df) - 1)
    row = df.iloc[idx]
    values: dict[str, str | float | None] = {}
    for f in record.feature_schema:
        v = row[f.name]
        if v is None or (not isinstance(v, str) and _is_na(v)):
            values[f.name] = None
        elif f.type == "numeric":
            values[f.name] = float(v)
        else:
            values[f.name] = str(v)
    return SampleRow(values=values)


def _is_na(value: object) -> bool:
    import pandas as pd

    return bool(pd.isna(value))


@router.delete(
    "/api/models/{model_id}",
    status_code=204,
    responses={404: {"model": ErrorResponse}},
)
def delete_model(model_id: str) -> None:
    models_store.delete_model(model_id)


@router.post(
    "/api/predict",
    response_model=PredictResponse,
    responses={404: {"model": ErrorResponse}},
)
def predict(req: PredictRequest) -> PredictResponse:
    record = models_store.get_model(req.model_id)
    return run_prediction(record, req.features)


@router.post(
    "/api/predict/batch",
    response_model=BatchPredictResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
    },
)
async def predict_batch(
    model_id: str = Form(...),
    file: UploadFile = ...,
) -> BatchPredictResponse:
    record = models_store.get_model(model_id)
    raw = await read_limited(file)
    if not raw:
        raise empty_file("Yüklenen dosya boş.")
    text, _encoding = decode_bytes(raw)
    df = parse_csv(text)
    return run_batch_prediction(record, df)
