"""Eğitim endpoint'leri:
- GET  /api/train/target/{dataset_id}?column=  → hedef analizi + öneri
- POST /api/train                              → SSE akışı (gerçek adımlar)
"""

from __future__ import annotations

import json
from collections.abc import Iterator

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from models.schemas import ErrorDetail, TargetAnalysisResponse, TrainRequest
from services import storage
from services.errors import invalid_target
from services.problem_type import analyze_target, resolve_problem_type
from services.training import train_stream

router = APIRouter(prefix="/api/train", tags=["train"])


def _require_column(record: object, column: str) -> None:
    if column not in record.df.columns:  # type: ignore[attr-defined]
        raise invalid_target(f"'{column}' adlı bir sütun yok.")


@router.get(
    "/target/{dataset_id}",
    response_model=TargetAnalysisResponse,
)
def analyze(dataset_id: str, column: str = Query(...)) -> TargetAnalysisResponse:
    record = storage.get_dataset(dataset_id)
    _require_column(record, column)
    a = analyze_target(record.df, column)
    return TargetAnalysisResponse(
        column=a.column,
        inferred_type=a.inferred_type,  # type: ignore[arg-type]
        unique_count=a.unique_count,
        sample_values=a.sample_values,
        trainable=a.trainable,
        suggested_problem_type=a.suggested,
        tone=a.tone,
        reason=a.reason,
        error=(
            ErrorDetail(code=a.error_code, message=a.error_message)
            if a.error_code
            else None
        ),
    )


@router.post("")
def train(req: TrainRequest) -> StreamingResponse:
    # Doğrulama akış başlamadan (normal JSON hata dönebilelim diye).
    record = storage.get_dataset(req.dataset_id)
    _require_column(record, req.target_column)
    analysis = analyze_target(record.df, req.target_column)
    problem_type = resolve_problem_type(analysis, req.problem_type)

    def sse() -> Iterator[bytes]:
        for event in train_stream(
            record, req.target_column, req.model_type, problem_type, req.tune
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n".encode("utf-8")

    return StreamingResponse(sse(), media_type="text/event-stream")
