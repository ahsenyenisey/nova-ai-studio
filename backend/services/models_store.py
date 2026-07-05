"""Bellek içi model deposu (self-contained, MVP; kalıcılık Faz 4).

Her model kaydı tahmin için gereken her şeyi saklar: fit'li sklearn Pipeline,
feature şeması (kategori listeleriyle), metrikler ve TÜM feature importance'lar.
Böylece kaynak veri seti LRU'dan düşse de tahmin/importance çalışır.
"""

from __future__ import annotations

import uuid
from collections import OrderedDict
from dataclasses import dataclass, field

from sklearn.pipeline import Pipeline

from models.schemas import (
    ClassificationMetrics,
    FeatureImportanceItem,
    FeatureSchemaItem,
    ImportanceList,
    ModelDetail,
    ModelSummary,
    ProblemType,
    RegressionMetrics,
)
from services import storage
from services.errors import model_not_found
from services.ranking import select_top

MAX_MODELS = 20
DEFAULT_IMPORTANCE_TOP = 15


@dataclass
class ModelRecord:
    model_id: str
    filename: str
    dataset_id: str
    target_column: str
    problem_type: ProblemType
    model_type: str
    created_at: str
    pipeline: Pipeline
    feature_schema: list[FeatureSchemaItem]
    importances: list[FeatureImportanceItem]  # tümü, azalan sırada
    n_train: int
    n_test: int
    primary_metric_name: str
    primary_metric_value: float
    classification: ClassificationMetrics | None = None
    regression: RegressionMetrics | None = None
    class_labels: list[str] | None = field(default=None)


_MODELS: "OrderedDict[str, ModelRecord]" = OrderedDict()


def create_model(**kwargs: object) -> ModelRecord:
    model_id = uuid.uuid4().hex
    record = ModelRecord(model_id=model_id, **kwargs)  # type: ignore[arg-type]
    _MODELS[model_id] = record
    _MODELS.move_to_end(model_id)
    while len(_MODELS) > MAX_MODELS:
        _MODELS.popitem(last=False)
    return record


def get_model(model_id: str) -> ModelRecord:
    record = _MODELS.get(model_id)
    if record is None:
        raise model_not_found()
    _MODELS.move_to_end(model_id)
    return record


def list_models() -> list[ModelSummary]:
    # En yeni önce.
    return [build_summary(r) for r in reversed(_MODELS.values())]


def _importance_list(
    record: ModelRecord, limit: int
) -> ImportanceList:
    """Ortak `select_top` ile top-N + gizli sayısı ("gerisi istek üzerine")."""
    names = [it.name for it in record.importances]
    scores = [it.importance for it in record.importances]
    selected, hidden = select_top(names, scores, limit)
    by_name = {it.name: it for it in record.importances}
    return ImportanceList(
        items=[by_name[n] for n in selected],
        total=len(record.importances),
        hidden_count=hidden,
    )


def build_summary(record: ModelRecord) -> ModelSummary:
    return ModelSummary(
        model_id=record.model_id,
        filename=record.filename,
        target_column=record.target_column,
        problem_type=record.problem_type,
        model_type=record.model_type,  # type: ignore[arg-type]
        created_at=record.created_at,
        n_train=record.n_train,
        n_test=record.n_test,
        source_dataset_available=storage.has_dataset(record.dataset_id),
        primary_metric_name=record.primary_metric_name,
        primary_metric_value=record.primary_metric_value,
    )


def build_detail(
    record: ModelRecord, importance_limit: int = DEFAULT_IMPORTANCE_TOP
) -> ModelDetail:
    summary = build_summary(record)
    return ModelDetail(
        **summary.model_dump(),
        feature_schema=record.feature_schema,
        classification=record.classification,
        regression=record.regression,
        importance=_importance_list(record, importance_limit),
    )


def build_importance(record: ModelRecord, limit: int | None) -> ImportanceList:
    return _importance_list(record, limit if limit is not None else len(record.importances))


def clear() -> None:
    _MODELS.clear()
