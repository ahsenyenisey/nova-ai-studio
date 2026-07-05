"""NOVA API — FastAPI uygulaması.

Faz 2: CSV yükleme (/api/upload) ve otomatik EDA (/api/eda/*). Tüm hatalar
CLAUDE.md gereği `{ "error": { "code", "message" } }` formatında döner.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import eda, upload
from services.errors import ApiError

app = FastAPI(title="NOVA API", version="0.2.0")

# Frontend geliştirme sunucusu (Next.js) için CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ApiError)
async def api_error_handler(_request: Request, exc: ApiError) -> JSONResponse:
    """ApiError'ı standart hata zarfına çevirir."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    """Servisin ayakta olduğunu doğrular."""
    return {"status": "ok", "service": "nova-api"}


app.include_router(upload.router)
app.include_router(eda.router)
