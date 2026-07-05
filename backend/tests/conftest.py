"""Pytest ortak fixture'ları."""

from __future__ import annotations

import pytest

from services import storage


@pytest.fixture(autouse=True)
def _clear_storage():
    """Her testten önce ve sonra bellek deposu temiz olsun."""
    storage.clear()
    yield
    storage.clear()
