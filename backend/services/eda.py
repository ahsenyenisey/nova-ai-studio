"""EDA hesaplamaları: özet istatistik, eksik harita, sütun seçimi,
korelasyon ve dağılım (histogram/kategori) verisi.

Grafik-ağır kısımlar (korelasyon + dağılım) varsayılan olarak en fazla
`DEFAULT_CHART_COLUMNS` sayısal sütunla sınırlanır; seçim ölçütü normalize
varyanstır (bkz. `select_numeric_columns`). Özet istatistikler ise TÜM sütunlar
için hesaplanır.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from models.schemas import (
    ChartData,
    ColumnStats,
    CorrelationMatrix,
    Distribution,
    HistogramBin,
    MissingCell,
    TopValue,
)
from services.csv_loader import infer_type
from services.ranking import select_top

DEFAULT_CHART_COLUMNS = 15
HISTOGRAM_BINS = 20
TOP_CATEGORIES = 10


def _to_float(value: object) -> float | None:
    """NaN/None güvenli float dönüşümü."""
    if value is None or pd.isna(value):
        return None
    return float(value)


def numeric_columns(df: pd.DataFrame) -> list[str]:
    """Sayısal (boolean hariç) sütun adları."""
    return [str(c) for c in df.columns if infer_type(df[c]) == "numeric"]


# --- Özet istatistikler (tüm sütunlar) -----------------------------------


def compute_column_stats(df: pd.DataFrame) -> list[ColumnStats]:
    stats: list[ColumnStats] = []
    n = len(df)
    for name in df.columns:
        series = df[name]
        missing = int(series.isna().sum())
        kind = infer_type(series)
        base = ColumnStats(
            name=str(name),
            inferred_type=kind,
            missing_count=missing,
            missing_ratio=(missing / n if n else 0.0),
        )
        if kind == "numeric":
            clean = series.dropna()
            base.mean = _to_float(clean.mean()) if len(clean) else None
            base.median = _to_float(clean.median()) if len(clean) else None
            base.std = _to_float(clean.std()) if len(clean) > 1 else None
            base.min = _to_float(clean.min()) if len(clean) else None
            base.max = _to_float(clean.max()) if len(clean) else None
        else:
            counts = series.value_counts(dropna=True)
            base.unique_count = int(series.nunique(dropna=True))
            base.top_values = [
                TopValue(value=str(idx), count=int(cnt))
                for idx, cnt in counts.head(TOP_CATEGORIES).items()
            ]
        stats.append(base)
    return stats


def build_missing_map(df: pd.DataFrame) -> list[MissingCell]:
    n = len(df)
    return [
        MissingCell(
            name=str(name),
            missing_ratio=(int(df[name].isna().sum()) / n if n else 0.0),
        )
        for name in df.columns
    ]


# --- Sütun seçimi (normalize varyansa göre) ------------------------------


def select_numeric_columns(
    df: pd.DataFrame, limit: int = DEFAULT_CHART_COLUMNS
) -> list[str]:
    """Sayısal sütunları min-max normalize varyansa göre sıralayıp ilk `limit`
    tanesini döner. Ölçek bağımsızdır; sabit sütunlar (varyans 0) en sona düşer.
    Eşitlikte orijinal sütun sırası korunur (stable)."""
    cols = numeric_columns(df)
    if len(cols) <= limit:
        return cols

    scores: list[float] = []
    for col in cols:
        clean = df[col].dropna()
        if len(clean) < 2:
            scores.append(0.0)
            continue
        lo, hi = float(clean.min()), float(clean.max())
        scores.append(float(((clean - lo) / (hi - lo)).var()) if hi > lo else 0.0)

    selected, _ = select_top(cols, scores, limit)
    return selected


# --- Korelasyon ve dağılımlar --------------------------------------------


def compute_correlation(
    df: pd.DataFrame, columns: list[str]
) -> tuple[CorrelationMatrix | None, bool, str | None]:
    """Seçili sayısal sütunlar için Pearson korelasyon matrisi.

    <2 sütun varsa (tek sütun / yetersiz sayısal) korelasyon üretilmez.
    Sıfır varyanslı sütunların hücreleri NaN → null olur.
    """
    if len(columns) < 2:
        return None, False, "Korelasyon için en az 2 sayısal sütun gerekir."

    corr = df[columns].corr(numeric_only=True)
    values: list[list[float | None]] = [
        [_to_float(corr.iat[i, j]) for j in range(len(columns))]
        for i in range(len(columns))
    ]
    return CorrelationMatrix(columns=columns, values=values), True, None


def _numeric_distribution(series: pd.Series, name: str) -> Distribution:
    clean = series.dropna().to_numpy()
    bins: list[HistogramBin] = []
    if clean.size > 0:
        counts, edges = np.histogram(clean, bins=HISTOGRAM_BINS)
        bins = [
            HistogramBin(
                start=float(edges[i]),
                end=float(edges[i + 1]),
                count=int(counts[i]),
            )
            for i in range(len(counts))
        ]
    return Distribution(name=name, inferred_type="numeric", bins=bins)


def compute_distributions(df: pd.DataFrame, columns: list[str]) -> list[Distribution]:
    """Seçili sayısal sütunlar için histogram verisi."""
    return [_numeric_distribution(df[col], str(col)) for col in columns]


def build_chart_data(df: pd.DataFrame, include: list[str] | None = None) -> ChartData:
    """Heatmap + dağılım verisini üretir.

    `include` verilirse yalnızca geçerli sayısal alt küme kullanılır; aksi halde
    normalize varyansa göre varsayılan seçim yapılır.
    """
    all_numeric = numeric_columns(df)
    total = len(all_numeric)

    if include is not None:
        selected = [c for c in include if c in all_numeric]
        if not selected:
            selected = select_numeric_columns(df)
    else:
        selected = select_numeric_columns(df)

    correlation, available, reason = compute_correlation(df, selected)
    distributions = compute_distributions(df, selected)

    return ChartData(
        selected_columns=selected,
        total_numeric=total,
        hidden_numeric_count=max(0, total - len(selected)),
        correlation_available=available,
        correlation_reason=reason,
        correlation=correlation,
        distributions=distributions,
    )
