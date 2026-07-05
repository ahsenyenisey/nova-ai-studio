"""Eğitim ve tahminde ORTAK kullanılan ön işleme (tek kaynak).

`build_preprocessor` bir sklearn `ColumnTransformer` üretir; fit'li hâli model
Pipeline'ının ilk adımı olur ve tahmin de aynı nesneyi kullanır. Ayrıca one-hot
ile genişleyen sütunları orijinal feature'a geri eşleyen yardımcı sağlar
(feature importance'ı anlamlı biçimde toplamak için).
"""

from __future__ import annotations

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from services.csv_loader import infer_type


def split_feature_types(
    df: pd.DataFrame, feature_cols: list[str]
) -> tuple[list[str], list[str]]:
    """Feature sütunlarını (sayısal, kategorik) olarak ayırır.

    boolean/datetime kategorik muamelesi görür (one-hot). Sıra korunur.
    """
    numeric: list[str] = []
    categorical: list[str] = []
    for col in feature_cols:
        if infer_type(df[col]) == "numeric":
            numeric.append(col)
        else:
            categorical.append(col)
    return numeric, categorical


def build_preprocessor(
    numeric: list[str], categorical: list[str]
) -> ColumnTransformer:
    """Sayısal: median impute + StandardScaler. Kategorik: most_frequent impute +
    OneHot(handle_unknown='ignore'). Tahminde görülmemiş kategori çökme yaratmaz."""
    transformers: list[tuple[str, Pipeline, list[str]]] = []
    if numeric:
        transformers.append(
            (
                "num",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="median")),
                        ("scale", StandardScaler()),
                    ]
                ),
                numeric,
            )
        )
    if categorical:
        transformers.append(
            (
                "cat",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="most_frequent")),
                        (
                            "onehot",
                            OneHotEncoder(
                                handle_unknown="ignore", sparse_output=False
                            ),
                        ),
                    ]
                ),
                categorical,
            )
        )
    return ColumnTransformer(transformers=transformers, remainder="drop")


def encoded_to_source(preprocessor: ColumnTransformer) -> list[str]:
    """Fit'li preprocessor'ın çıktı sütunlarını, `get_feature_names_out` sırasına
    uygun biçimde orijinal feature adlarına eşler (isim ayrıştırmadan, yapıdan)."""
    sources: list[str] = []
    for name, trans, cols in preprocessor.transformers_:
        if name == "remainder" or trans == "drop":
            continue
        if name == "num":
            sources.extend(cols)
        elif name == "cat":
            ohe: OneHotEncoder = trans.named_steps["onehot"]
            for col, cats in zip(cols, ohe.categories_):
                sources.extend([col] * len(cats))
    return sources


def build_feature_schema(
    df: pd.DataFrame, feature_cols: list[str]
) -> list[dict[str, object]]:
    """Her feature için ad, tip ve (kategorikse) eğitimde görülen kategori listesi.

    Model kaydında saklanır → tahmin formu ve bilinmeyen-kategori uyarıları veri
    seti düşse de çalışır (self-contained).
    """
    numeric, _ = split_feature_types(df, feature_cols)
    numeric_set = set(numeric)
    schema: list[dict[str, object]] = []
    for col in feature_cols:
        if col in numeric_set:
            schema.append({"name": col, "type": "numeric", "categories": None})
        else:
            cats = [str(v) for v in df[col].dropna().unique().tolist()]
            schema.append({"name": col, "type": "categorical", "categories": cats})
    return schema
