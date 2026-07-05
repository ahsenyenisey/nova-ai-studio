"""POST /api/upload — CSV yükle, doğrula, bellekte sakla, özet döndür."""

from __future__ import annotations

from fastapi import APIRouter, Request, UploadFile

from models.schemas import ErrorResponse, UploadResponse
from services import storage
from services.csv_loader import decode_bytes, parse_csv
from services.errors import MAX_UPLOAD_BYTES, empty_file, file_too_large

router = APIRouter(prefix="/api", tags=["upload"])

_CHUNK = 1024 * 1024  # 1MB


async def _read_limited(file: UploadFile) -> bytes:
    """Dosyayı parçalı okur; 20MB aşılırsa tamamını belleğe almadan reddeder."""
    buffer = bytearray()
    while True:
        chunk = await file.read(_CHUNK)
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > MAX_UPLOAD_BYTES:
            raise file_too_large()
    return bytes(buffer)


@router.post(
    "/upload",
    response_model=UploadResponse,
    responses={
        400: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
    },
)
async def upload_csv(request: Request, file: UploadFile) -> UploadResponse:
    # Hızlı yol: Content-Length açıkça sınırı aşıyorsa erken reddet.
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit():
        if int(content_length) > MAX_UPLOAD_BYTES + _CHUNK:
            raise file_too_large()

    raw = await _read_limited(file)
    if not raw:
        raise empty_file("Yüklenen dosya boş.")

    text, encoding = decode_bytes(raw)
    df = parse_csv(text)

    record = storage.create_dataset(
        filename=file.filename or "dataset.csv",
        encoding=encoding,
        df=df,
    )

    return UploadResponse(
        dataset_id=record.dataset_id,
        filename=record.filename,
        encoding=record.encoding,
        n_rows=len(df),
        n_cols=df.shape[1],
        columns=record.columns,
        preview=record.preview,
    )
