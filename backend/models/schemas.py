"""NOVA API — pydantic yanıt ve hata şemaları.

Tüm hatalar CLAUDE.md gereği `{ "error": { "code": str, "message": str } }`
formatında döner (bkz. `ApiError` / `main.py` handler).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

# --- Ortak tipler ---------------------------------------------------------

InferredType = Literal["numeric", "boolean", "datetime", "categorical"]


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    """Tüm hata yanıtlarının zarfı."""

    error: ErrorDetail


# --- Upload ---------------------------------------------------------------


class ColumnInfo(BaseModel):
    name: str
    dtype: str
    inferred_type: InferredType


class UploadResponse(BaseModel):
    dataset_id: str
    filename: str
    encoding: str
    n_rows: int
    n_cols: int
    columns: list[ColumnInfo]
    # İlk ~8 satırlık küçük önizleme (her hücre string'e çevrilir).
    preview: list[dict[str, str | None]]


# --- EDA ------------------------------------------------------------------


class ColumnStats(BaseModel):
    name: str
    inferred_type: InferredType
    missing_count: int
    missing_ratio: float
    # Sayısal sütunlar için (kategorikte None):
    mean: float | None = None
    median: float | None = None
    std: float | None = None
    min: float | None = None
    max: float | None = None
    # Kategorik sütunlar için (sayısalda None):
    unique_count: int | None = None
    top_values: list[TopValue] | None = None


class TopValue(BaseModel):
    value: str
    count: int


class MissingCell(BaseModel):
    name: str
    missing_ratio: float


class HistogramBin(BaseModel):
    start: float
    end: float
    count: int


class Distribution(BaseModel):
    name: str
    inferred_type: InferredType
    # Sayısal → bins dolu; kategorik → categories dolu.
    bins: list[HistogramBin] | None = None
    categories: list[TopValue] | None = None
    other_count: int | None = None


class CorrelationMatrix(BaseModel):
    columns: list[str]
    # NxN; hesaplanamayan hücreler (sıfır varyans) null.
    values: list[list[float | None]]


class ChartData(BaseModel):
    """Seçili sayısal sütunlara ait grafik verisi (heatmap + dağılımlar)."""

    selected_columns: list[str]
    total_numeric: int
    hidden_numeric_count: int
    correlation_available: bool
    correlation_reason: str | None = None
    correlation: CorrelationMatrix | None = None
    distributions: list[Distribution]


class EdaResponse(BaseModel):
    dataset_id: str
    filename: str
    encoding: str
    n_rows: int
    n_cols: int
    column_stats: list[ColumnStats]
    missing_map: list[MissingCell]
    charts: ChartData


# Pydantic v2: ileri referansları (TopValue ColumnStats'tan önce geçiyor) çöz.
ColumnStats.model_rebuild()
