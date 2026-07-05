"""Ortak "hepsini hesapla, top-N göster, gerisi istek üzerine" yardımcısı.

Hem EDA sütun seçiminde (varyansa göre) hem de model feature importance'ında
(önem skoruna göre) kullanılır. Tek doğruluk kaynağı: sıralama + top-N + gizli sayısı.
"""

from __future__ import annotations


def select_top(
    names: list[str], scores: list[float], limit: int
) -> tuple[list[str], int]:
    """`scores`'a göre azalan sıralar, ilk `limit` adını ve gizlenen sayısını döner.

    Eşitlikte orijinal sıra korunur (stable). `names` ve `scores` aynı uzunlukta
    olmalıdır. `limit` toplamdan büyük/eşitse hepsi seçilir, hidden=0.
    """
    if len(names) != len(scores):
        raise ValueError("names ve scores aynı uzunlukta olmalı")
    if limit >= len(names):
        return list(names), 0

    order = sorted(range(len(names)), key=lambda i: (-scores[i], i))
    selected = [names[i] for i in order[:limit]]
    return selected, len(names) - limit
