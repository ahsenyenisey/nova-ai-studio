"""Ön işleme testleri: tip ayrımı, one-hot çıktısı, encoded→orijinal eşleme."""

from __future__ import annotations

import pandas as pd

from services.preprocessing import (
    build_feature_schema,
    build_preprocessor,
    encoded_to_source,
    split_feature_types,
)


def _df() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "age": [20, 30, None, 40],
            "city": ["A", "B", "A", "C"],
            "score": [1.0, 2.0, 3.0, 4.0],
        }
    )


def test_split_feature_types():
    numeric, categorical = split_feature_types(_df(), ["age", "city", "score"])
    assert numeric == ["age", "score"]
    assert categorical == ["city"]


def test_preprocessor_imputes_and_encodes():
    df = _df()
    pre = build_preprocessor(["age", "score"], ["city"])
    out = pre.fit_transform(df)
    # 2 sayısal + 3 kategori (A,B,C) one-hot = 5 sütun; eksik değer impute edildi.
    assert out.shape == (4, 5)


def test_encoded_to_source_maps_back():
    df = _df()
    pre = build_preprocessor(["age", "score"], ["city"])
    pre.fit(df)
    sources = encoded_to_source(pre)
    # age, score + city*3
    assert sources == ["age", "score", "city", "city", "city"]


def test_feature_schema_lists_categories():
    schema = {s["name"]: s for s in build_feature_schema(_df(), ["age", "city"])}
    assert schema["age"]["type"] == "numeric"
    assert schema["city"]["type"] == "categorical"
    assert set(schema["city"]["categories"]) == {"A", "B", "C"}
