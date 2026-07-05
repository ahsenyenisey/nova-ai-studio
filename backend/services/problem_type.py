"""Hedef sütun analizi + problem tipi önerisi/çözümü.

Öneri sessiz değildir: UI gerekçeli bir rozet gösterir, kullanıcı override eder.
Kural: kategorik/boolean → sınıflandırma; sayısal → regresyon, ancak tam sayı ve
benzersiz ≤10 ise sınıflandırma önerilir. Hedef tek-değerli veya (ID gibi) tümü
benzersiz kategorikse eğitime izin verilmez (INVALID_TARGET).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import pandas as pd

from services.csv_loader import infer_type
from services.errors import invalid_target

ProblemType = Literal["classification", "regression"]
Tone = Literal["confident", "unsure"]

# Sayısal hedefte sınıflandırma önerisi için azami benzersiz değer.
CLASS_MAX_UNIQUE = 10
SAMPLE_LIMIT = 8


@dataclass
class TargetAnalysis:
    column: str
    inferred_type: str
    unique_count: int
    sample_values: list[str]
    trainable: bool
    suggested: ProblemType | None
    tone: Tone | None
    reason: str
    error_code: str | None = None
    error_message: str | None = None


def _is_integer_series(series: pd.Series) -> bool:
    clean = series.dropna()
    if clean.empty:
        return False
    if pd.api.types.is_integer_dtype(clean):
        return True
    if pd.api.types.is_float_dtype(clean):
        return bool((clean == clean.round()).all())
    return False


def _looks_ordinal(series: pd.Series) -> bool:
    """Değerler bitişik bir tam sayı aralığı mı (ör. 1..10 puan)?"""
    vals = sorted(int(v) for v in series.dropna().unique())
    return len(vals) > 1 and (vals[-1] - vals[0] + 1) == len(vals)


def analyze_target(df: pd.DataFrame, column: str) -> TargetAnalysis:
    series = df[column]
    n = len(df)
    non_null = series.dropna()
    nunique = int(non_null.nunique())
    kind = infer_type(series)
    samples = [str(v) for v in non_null.unique()[:SAMPLE_LIMIT]]

    def not_trainable(reason: str) -> TargetAnalysis:
        return TargetAnalysis(
            column=column,
            inferred_type=kind,
            unique_count=nunique,
            sample_values=samples,
            trainable=False,
            suggested=None,
            tone=None,
            reason=reason,
            error_code="INVALID_TARGET",
            error_message=reason,
        )

    if nunique <= 1:
        return not_trainable(
            "Hedef sütun tek bir değer içeriyor; modellenemez."
        )

    if kind in ("categorical", "boolean"):
        if nunique == len(non_null):
            return not_trainable(
                "Hedef her satırda benzersiz (muhtemelen bir kimlik sütunu); "
                "sınıflandırma için uygun değil."
            )
        return TargetAnalysis(
            column=column,
            inferred_type=kind,
            unique_count=nunique,
            sample_values=samples,
            trainable=True,
            suggested="classification",
            tone="confident",
            reason=f"Kategorik hedef ({nunique} benzersiz değer) → sınıflandırma.",
        )

    # Sayısal hedef.
    if _is_integer_series(series) and nunique <= CLASS_MAX_UNIQUE:
        ordinal = 8 <= nunique <= CLASS_MAX_UNIQUE and _looks_ordinal(series)
        return TargetAnalysis(
            column=column,
            inferred_type=kind,
            unique_count=nunique,
            sample_values=samples,
            trainable=True,
            suggested="classification",
            tone="unsure" if ordinal else "confident",
            reason=(
                f"Az sayıda tam sayı değeri ({nunique} benzersiz) → sınıflandırma "
                "önerilir"
                + (
                    "; ancak sıralı bir ölçek (ör. puan) olabilir, regresyon da "
                    "düşünülebilir."
                    if ordinal
                    else "."
                )
            ),
        )

    return TargetAnalysis(
        column=column,
        inferred_type=kind,
        unique_count=nunique,
        sample_values=samples,
        trainable=True,
        suggested="regression",
        tone="confident",
        reason="Sürekli sayısal hedef → regresyon.",
    )


def resolve_problem_type(
    analysis: TargetAnalysis, override: str | None
) -> ProblemType:
    """Nihai problem tipini döner; uyumsuz override veya eğitilemez hedefte
    `ApiError(INVALID_TARGET)` fırlatır."""
    if not analysis.trainable:
        raise invalid_target(analysis.error_message or "Hedef sütun uygun değil.")

    if override is None:
        assert analysis.suggested is not None
        return analysis.suggested

    if override not in ("classification", "regression"):
        raise invalid_target(f"Geçersiz problem tipi: {override!r}")

    if override == "regression" and analysis.inferred_type != "numeric":
        raise invalid_target(
            "Regresyon sayısal bir hedef gerektirir; bu sütun sayısal değil."
        )

    # Sürekli/çok-benzersiz sayısal hedefte sınıflandırma anlamsız olur.
    if (
        override == "classification"
        and analysis.inferred_type == "numeric"
        and analysis.suggested == "regression"
    ):
        raise invalid_target(
            "Bu sürekli sayısal hedef sınıflandırmaya uygun değil "
            "(çok fazla benzersiz değer)."
        )

    return override  # type: ignore[return-value]
