"""csv_loader: encoding zinciri, doğrulama ve tip çıkarımı testleri."""

from __future__ import annotations

import pandas as pd
import pytest

from services.csv_loader import decode_bytes, infer_type, parse_csv
from services.errors import ApiError


# --- decode_bytes ---------------------------------------------------------


def test_decode_utf8():
    text, enc = decode_bytes("ad,not\nAli,5\n".encode("utf-8"))
    assert enc == "utf-8"
    assert "Ali" in text


def test_decode_utf8_sig_bom():
    text, enc = decode_bytes("ad\nAli\n".encode("utf-8-sig"))
    assert enc == "utf-8-sig"
    assert text.startswith("ad")


def test_decode_windows_1254_turkish():
    # Türkçe karakterli, utf-8'de geçersiz olan windows-1254 baytları.
    raw = "ad,şehir\nAli,İzmir\nAyşe,Şırnak\n".encode("windows-1254")
    text, enc = decode_bytes(raw)
    assert enc == "windows-1254"
    assert "şehir" in text and "İzmir" in text


def test_decode_empty_raises():
    with pytest.raises(ApiError) as exc:
        decode_bytes(b"")
    assert exc.value.code == "EMPTY_FILE"


def test_decode_garbage_raises_invalid_encoding():
    # windows-1254'te tanımsız baytlar → yüksek replacement oranı.
    raw = bytes([0x81, 0x8D, 0x8E, 0x8F, 0x90, 0x9D, 0x9E] * 30)
    with pytest.raises(ApiError) as exc:
        decode_bytes(raw)
    assert exc.value.code == "INVALID_ENCODING"


def test_decode_below_threshold_tolerated():
    # Çoğunlukla geçerli windows-1254 metni + tek tanımsız bayt → hâlâ kabul.
    good = "ad,şehir\n" + "\n".join(f"kişi{i},İzmir" for i in range(200))
    raw = good.encode("windows-1254") + bytes([0x81])
    text, enc = decode_bytes(raw)
    assert enc == "windows-1254"
    assert "İzmir" in text


# --- parse_csv ------------------------------------------------------------


def test_parse_good():
    df = parse_csv("a,b\n1,2\n3,4\n")
    assert df.shape == (2, 2)


def test_parse_header_only_raises_empty():
    with pytest.raises(ApiError) as exc:
        parse_csv("a,b,c\n")
    assert exc.value.code == "EMPTY_FILE"


def test_parse_blank_raises_empty():
    with pytest.raises(ApiError) as exc:
        parse_csv("   \n  \n")
    assert exc.value.code == "EMPTY_FILE"


def test_parse_single_column_ok():
    df = parse_csv("only\n1\n2\n3\n")
    assert df.shape == (3, 1)


# --- infer_type -----------------------------------------------------------


def test_infer_type_numeric_categorical_boolean():
    df = pd.DataFrame(
        {
            "num": [1, 2, 3],
            "cat": ["a", "b", "a"],
            "flag": [True, False, True],
        }
    )
    assert infer_type(df["num"]) == "numeric"
    assert infer_type(df["cat"]) == "categorical"
    assert infer_type(df["flag"]) == "boolean"
