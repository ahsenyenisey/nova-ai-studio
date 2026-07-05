"""EDA endpoint'leri:
- GET /api/eda/{dataset_id}          → tam EDA (tüm sütun istatistikleri + grafikler)
- GET /api/eda/{dataset_id}/columns  → seçili sayısal alt küme için grafik verisi
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from models.schemas import ChartData, EdaResponse, ErrorResponse
from services import eda as eda_service
from services import storage

router = APIRouter(prefix="/api/eda", tags=["eda"])


@router.get(
    "/{dataset_id}",
    response_model=EdaResponse,
    responses={404: {"model": ErrorResponse}},
)
def get_eda(dataset_id: str) -> EdaResponse:
    record = storage.get_dataset(dataset_id)
    return storage.get_eda(record)


@router.get(
    "/{dataset_id}/columns",
    response_model=ChartData,
    responses={404: {"model": ErrorResponse}},
)
def get_eda_columns(
    dataset_id: str,
    include: str | None = Query(
        default=None,
        description="Virgülle ayrılmış sayısal sütun adları.",
    ),
) -> ChartData:
    record = storage.get_dataset(dataset_id)
    columns = None
    if include is not None:
        columns = [c.strip() for c in include.split(",") if c.strip()]
    return eda_service.build_chart_data(record.df, include=columns)
