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


# --- Model eğitimi (Faz 3) ------------------------------------------------

ProblemType = Literal["classification", "regression"]
ModelType = Literal["random_forest", "gradient_boosting", "linear"]
Tone = Literal["confident", "unsure"]


class TargetAnalysisResponse(BaseModel):
    column: str
    inferred_type: InferredType
    unique_count: int
    sample_values: list[str]
    trainable: bool
    suggested_problem_type: ProblemType | None
    tone: Tone | None
    reason: str
    error: ErrorDetail | None = None


class TrainRequest(BaseModel):
    dataset_id: str
    target_column: str
    model_type: ModelType = "random_forest"
    # None → otomatik öneri kullanılır; aksi halde override.
    problem_type: ProblemType | None = None


class FeatureSchemaItem(BaseModel):
    name: str
    type: Literal["numeric", "categorical"]
    categories: list[str] | None = None


class ConfusionMatrix(BaseModel):
    labels: list[str]
    matrix: list[list[int]]


class ClassificationMetrics(BaseModel):
    accuracy: float
    f1: float
    precision: float
    recall: float
    class_labels: list[str]
    confusion_matrix: ConfusionMatrix


class ResidualPoint(BaseModel):
    actual: float
    predicted: float


class RegressionMetrics(BaseModel):
    r2: float
    mae: float
    rmse: float
    residuals: list[ResidualPoint]


class FeatureImportanceItem(BaseModel):
    name: str
    importance: float


class ImportanceList(BaseModel):
    items: list[FeatureImportanceItem]
    total: int
    hidden_count: int


class ModelSummary(BaseModel):
    model_id: str
    filename: str
    target_column: str
    problem_type: ProblemType
    model_type: ModelType
    created_at: str
    n_train: int
    n_test: int
    source_dataset_available: bool
    primary_metric_name: str
    primary_metric_value: float


class ModelDetail(ModelSummary):
    feature_schema: list[FeatureSchemaItem]
    classification: ClassificationMetrics | None = None
    regression: RegressionMetrics | None = None
    importance: ImportanceList


class PredictRequest(BaseModel):
    model_id: str
    features: dict[str, str | float | bool | None]


class PredictResponse(BaseModel):
    model_id: str
    problem_type: ProblemType
    prediction: str | float
    # Sınıflandırmada sınıf→olasılık; regresyonda None (Faz 4'te aralık eklenecek).
    probabilities: dict[str, float] | None = None
    confidence: float | None = None
    warnings: list[str] = []
