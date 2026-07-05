"""Uygulama genel hata tipi.

`ApiError` fırlatıldığında `main.py`'deki handler onu CLAUDE.md formatındaki
`{ "error": { "code", "message" } }` yanıtına çevirir.
"""

from __future__ import annotations


class ApiError(Exception):
    """Kullanıcıya dönecek, kod + HTTP durumu taşıyan hata."""

    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


# Sık kullanılan hata üreticileri (tutarlı kod/mesaj için).

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20MB


def file_too_large() -> ApiError:
    return ApiError(
        "FILE_TOO_LARGE",
        "Dosya 20MB sınırını aşıyor. Lütfen daha küçük bir CSV yükleyin.",
        status_code=413,
    )


def empty_file(detail: str = "Dosya boş görünüyor.") -> ApiError:
    return ApiError("EMPTY_FILE", detail, status_code=400)


def invalid_encoding() -> ApiError:
    return ApiError(
        "INVALID_ENCODING",
        "Dosyanın karakter kodlaması çözülemedi. UTF-8 olarak kaydedip "
        "tekrar deneyin.",
        status_code=400,
    )


def invalid_csv(detail: str = "Dosya geçerli bir CSV olarak okunamadı.") -> ApiError:
    return ApiError("INVALID_CSV", detail, status_code=400)


def dataset_not_found() -> ApiError:
    return ApiError(
        "DATASET_NOT_FOUND",
        "Veri seti bulunamadı. Yeniden yüklemeniz gerekebilir.",
        status_code=404,
    )
