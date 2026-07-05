"""Pytest ortak fixture'ları."""

from __future__ import annotations

import pytest

from services import models_store, storage


@pytest.fixture(autouse=True)
def _clear_storage():
    """Her testten önce ve sonra bellek depoları temiz olsun."""
    storage.clear()
    models_store.clear()
    yield
    storage.clear()
    models_store.clear()
