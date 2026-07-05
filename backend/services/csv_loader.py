"""CSV çözme, doğrulama ve tip çıkarımı.

Sorumluluklar:
- Baytları encoding zinciriyle metne çevir (utf-8 → utf-8-sig → windows-1254).
- Boş dosya / bozuk encoding / geçersiz CSV senaryolarını `ApiError`'a çevir.
- pandas DataFrame üret ve sütun tiplerini çıkar.
"""

from __future__ import annotations

from io import StringIO

import pandas as pd
from pandas.errors import EmptyDataError, ParserError

from models.schemas import ColumnInfo, InferredType
from services.errors import empty_file, invalid_csv, invalid_encoding

# Encoding deneme sırası. windows-1254 = Türkçe Excel (latin-1 yerine tercih).
ENCODING_CHAIN: tuple[str, ...] = ("utf-8", "utf-8-sig", "windows-1254")

# windows-1254 fallback'inde tolere edilen azami replacement (�) oranı.
MAX_REPLACEMENT_RATIO = 0.01

REPLACEMENT_CHAR = "�"


def decode_bytes(raw: bytes) -> tuple[str, str]:
    """Baytları metne çevirir; (metin, kullanılan_encoding) döner.

    utf-8 ve utf-8-sig katı denenir; ikisi de başarısızsa windows-1254 ile
    `errors="replace"` kullanılır ve replacement karakteri oranı %1'i aşarsa
    sessiz bozulmayı önlemek için `INVALID_ENCODING` fırlatılır.
    """
    if raw == b"":
        raise empty_file("Yüklenen dosya 0 bayt.")

    # 1-2) UTF-8: baştaki BOM (EF BB BF) varsa ayıkla ve utf-8-sig olarak
    #      raporla, yoksa düz utf-8. (BOM metinde kalırsa ilk sütun adını kirletir.)
    if raw[:3] == b"\xef\xbb\xbf":
        try:
            return raw[3:].decode("utf-8"), "utf-8-sig"
        except UnicodeDecodeError:
            pass
    else:
        try:
            return raw.decode("utf-8"), "utf-8"
        except UnicodeDecodeError:
            pass

    # 3) windows-1254 fallback — bozulmayı ölç.
    text = raw.decode("windows-1254", errors="replace")
    if text:
        ratio = text.count(REPLACEMENT_CHAR) / len(text)
        if ratio > MAX_REPLACEMENT_RATIO:
            raise invalid_encoding()
    return text, "windows-1254"


def parse_csv(text: str) -> pd.DataFrame:
    """Metni DataFrame'e çevirir; boş/geçersiz durumları ApiError'a map'ler."""
    if text.strip() == "":
        raise empty_file("Dosyada içerik yok.")

    try:
        df = pd.read_csv(StringIO(text))
    except EmptyDataError as exc:
        raise empty_file("Dosyada sütun/veri bulunamadı.") from exc
    except (ParserError, ValueError) as exc:
        raise invalid_csv() from exc

    if df.shape[1] == 0:
        raise invalid_csv("Dosyada hiç sütun bulunamadı.")
    if len(df) == 0:
        # Başlık var ama veri satırı yok.
        raise empty_file("Başlık bulundu ancak veri satırı yok.")

    return df


def infer_type(series: pd.Series) -> InferredType:
    """Bir sütunun EDA amaçlı tipini çıkarır."""
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    return "categorical"


def describe_columns(df: pd.DataFrame) -> list[ColumnInfo]:
    """Sütun adı, ham dtype ve çıkarılan tipi listeler."""
    return [
        ColumnInfo(
            name=str(name),
            dtype=str(df[name].dtype),
            inferred_type=infer_type(df[name]),
        )
        for name in df.columns
    ]


def build_preview(df: pd.DataFrame, rows: int = 8) -> list[dict[str, str | None]]:
    """İlk N satırı string hücrelere çevirerek önizleme üretir (NaN → None)."""
    head = df.head(rows)
    preview: list[dict[str, str | None]] = []
    for _, row in head.iterrows():
        preview.append(
            {
                str(col): (None if pd.isna(val) else str(val))
                for col, val in row.items()
            }
        )
    return preview
