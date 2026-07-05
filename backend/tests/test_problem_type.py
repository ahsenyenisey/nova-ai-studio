"""Problem tipi algılama, override doğrulama ve INVALID_TARGET testleri."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from services.errors import ApiError
from services.problem_type import analyze_target, resolve_problem_type


def test_categorical_target_is_classification():
    df = pd.DataFrame({"y": ["a", "b", "a", "c"]})
    a = analyze_target(df, "y")
    assert a.trainable and a.suggested == "classification" and a.tone == "confident"


def test_continuous_numeric_is_regression():
    df = pd.DataFrame({"y": np.linspace(0, 100, 50) + np.arange(50) * 0.1})
    a = analyze_target(df, "y")
    assert a.suggested == "regression" and a.tone == "confident"


def test_binary_integer_is_classification_confident():
    df = pd.DataFrame({"y": [0, 1, 1, 0, 1, 0, 0, 1]})
    a = analyze_target(df, "y")
    assert a.suggested == "classification" and a.tone == "confident"


def test_ordinal_1_to_10_is_unsure():
    df = pd.DataFrame({"y": list(range(1, 11)) * 3})
    a = analyze_target(df, "y")
    assert a.suggested == "classification" and a.tone == "unsure"


def test_constant_target_not_trainable():
    df = pd.DataFrame({"y": [5, 5, 5, 5]})
    a = analyze_target(df, "y")
    assert not a.trainable and a.error_code == "INVALID_TARGET"


def test_all_unique_categorical_is_id_not_trainable():
    df = pd.DataFrame({"y": [f"id_{i}" for i in range(20)]})
    a = analyze_target(df, "y")
    assert not a.trainable and a.error_code == "INVALID_TARGET"


def test_resolve_override_regression_requires_numeric():
    df = pd.DataFrame({"y": ["a", "b", "a", "c"]})
    a = analyze_target(df, "y")
    with pytest.raises(ApiError) as exc:
        resolve_problem_type(a, "regression")
    assert exc.value.code == "INVALID_TARGET"


def test_resolve_override_classification_on_binary_ok():
    df = pd.DataFrame({"y": [0, 1, 1, 0]})
    a = analyze_target(df, "y")
    assert resolve_problem_type(a, "classification") == "classification"
    # override yoksa öneri kullanılır
    assert resolve_problem_type(a, None) == "classification"
