"""Model endpoint'leri:
- GET  /api/models                      → model listesi
- GET  /api/models/{id}                 → model detayı
- GET  /api/models/{id}/importance      → feature importance (top-N / genişletilmiş)
- POST /api/predict                     → tekil tahmin (minimal; şema Faz 4-uyumlu)
"""

from __future__ import annotations

from fastapi import APIRouter, Form, Query, UploadFile

from models.schemas import (
    BatchPredictResponse,
    ErrorResponse,
    ImportanceList,
    ModelDetail,
    ModelSummary,
    PredictRequest,
    PredictResponse,
)
from routers.upload import read_limited
from services import models_store
from services.csv_loader import decode_bytes, parse_csv
from services.errors import empty_file
from services.training import run_batch_prediction, run_prediction

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
) -> ImportanceList:
    record = models_store.get_model(model_id)
    return models_store.build_importance(record, limit)


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
