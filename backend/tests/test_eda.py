"""EDA hesaplama testleri: istatistik, sütun seçimi, korelasyon, dağılım."""

from __future__ import annotations

import numpy as np
import pandas as pd

from services.eda import (
    build_chart_data,
    compute_column_stats,
    compute_correlation,
    compute_distributions,
    select_numeric_columns,
)


def test_column_stats_numeric_and_categorical():
    df = pd.DataFrame({"x": [1.0, 2.0, 3.0, None], "c": ["a", "a", "b", "b"]})
    stats = {s.name: s for s in compute_column_stats(df)}

    x = stats["x"]
    assert x.inferred_type == "numeric"
    assert x.missing_count == 1
    assert x.missing_ratio == 0.25
    assert x.mean == 2.0
    assert x.median == 2.0

    c = stats["c"]
    assert c.inferred_type == "categorical"
    assert c.unique_count == 2
    assert {tv.value: tv.count for tv in c.top_values} == {"a": 2, "b": 2}


def test_select_numeric_columns_by_variance_caps_and_ranks():
    # 20 sayısal sütun; biri sabit (varyans 0) → seçime girmemeli.
    data = {f"n{i}": np.linspace(0, i + 1, 50) for i in range(19)}
    data["const"] = np.ones(50)
    df = pd.DataFrame(data)

    selected = select_numeric_columns(df, limit=15)
    assert len(selected) == 15
    assert "const" not in selected


def test_correlation_needs_two_numeric():
    single = pd.DataFrame({"x": [1, 2, 3]})
    matrix, available, reason = compute_correlation(single, ["x"])
    assert matrix is None and available is False and reason


def test_correlation_matrix_diagonal_is_one():
    df = pd.DataFrame({"a": [1, 2, 3, 4], "b": [2, 4, 6, 8]})
    matrix, available, _ = compute_correlation(df, ["a", "b"])
    assert available is True
    assert matrix is not None
    assert matrix.values[0][0] == 1.0
    # a ve b tam korelasyonlu.
    assert round(matrix.values[0][1], 6) == 1.0


def test_distributions_numeric_bins():
    df = pd.DataFrame({"x": list(range(100))})
    dists = compute_distributions(df, ["x"])
    assert len(dists) == 1
    assert dists[0].bins is not None
    assert sum(b.count for b in dists[0].bins) == 100


def test_build_chart_data_hidden_count_and_include():
    data = {f"n{i}": np.linspace(0, i + 1, 30) for i in range(18)}
    df = pd.DataFrame(data)

    default = build_chart_data(df)
    assert default.total_numeric == 18
    assert len(default.selected_columns) == 15
    assert default.hidden_numeric_count == 3

    subset = build_chart_data(df, include=["n0", "n1", "n2"])
    assert subset.selected_columns == ["n0", "n1", "n2"]
    assert subset.hidden_numeric_count == 15


def test_build_chart_data_single_numeric_no_correlation():
    df = pd.DataFrame({"x": [1, 2, 3], "c": ["a", "b", "c"]})
    charts = build_chart_data(df)
    assert charts.total_numeric == 1
    assert charts.correlation_available is False
    assert charts.correlation is None
