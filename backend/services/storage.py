"""Bellek içi veri seti deposu (MVP; kalıcılık Faz 4).

Her yükleme bir `DatasetRecord` olarak saklanır. Tam EDA yanıtı ilk istendiğinde
hesaplanıp kayıtta cache'lenir. Bellek koruması için en fazla `MAX_DATASETS`
kayıt tutulur (LRU: en eski erişilen düşer).
"""

from __future__ import annotations

import uuid
from collections import OrderedDict
from dataclasses import dataclass, field

import pandas as pd

from models.schemas import ColumnInfo, EdaResponse
from services import eda as eda_service
from services.csv_loader import build_preview, describe_columns
from services.errors import dataset_not_found

MAX_DATASETS = 20


@dataclass
class DatasetRecord:
    dataset_id: str
    filename: str
    encoding: str
    df: pd.DataFrame
    columns: list[ColumnInfo]
    preview: list[dict[str, str | None]]
    # İlk GET /api/eda'da doldurulur.
    eda_cache: EdaResponse | None = field(default=None)


_DATASETS: "OrderedDict[str, DatasetRecord]" = OrderedDict()


def create_dataset(filename: str, encoding: str, df: pd.DataFrame) -> DatasetRecord:
    dataset_id = uuid.uuid4().hex
    record = DatasetRecord(
        dataset_id=dataset_id,
        filename=filename,
        encoding=encoding,
        df=df,
        columns=describe_columns(df),
        preview=build_preview(df),
    )
    _DATASETS[dataset_id] = record
    _DATASETS.move_to_end(dataset_id)
    while len(_DATASETS) > MAX_DATASETS:
        _DATASETS.popitem(last=False)  # en eski erişileni düşür
    return record


def get_dataset(dataset_id: str) -> DatasetRecord:
    record = _DATASETS.get(dataset_id)
    if record is None:
        raise dataset_not_found()
    _DATASETS.move_to_end(dataset_id)
    return record


def get_eda(record: DatasetRecord) -> EdaResponse:
    """Tam EDA yanıtını (varsayılan sütun seçimiyle) üretir ve cache'ler."""
    if record.eda_cache is not None:
        return record.eda_cache

    df = record.df
    response = EdaResponse(
        dataset_id=record.dataset_id,
        filename=record.filename,
        encoding=record.encoding,
        n_rows=len(df),
        n_cols=df.shape[1],
        column_stats=eda_service.compute_column_stats(df),
        missing_map=eda_service.build_missing_map(df),
        charts=eda_service.build_chart_data(df),
    )
    record.eda_cache = response
    return response


def clear() -> None:
    """Testler için deposu sıfırlar."""
    _DATASETS.clear()
