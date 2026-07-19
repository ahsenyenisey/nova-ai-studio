"""NOVA API — FastAPI uygulaması.

Faz 2: CSV yükleme (/api/upload) ve otomatik EDA (/api/eda/*). Tüm hatalar
CLAUDE.md gereği `{ "error": { "code", "message" } }` formatında döner.
"""

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import eda, models, train, upload
from services.errors import ApiError

app = FastAPI(title="NOVA API", version="0.3.0")

# CORS: yerel geliştirme + ALLOWED_ORIGINS env'inden gelen ek origin'ler.
# `allow_origin_regex` her Vercel dağıtımını (preview + production) otomatik kabul
# eder → frontend'in kesin URL'sini önceden bilmeye gerek yok.
_default_origins = ["http://localhost:3000"]
_env_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _env_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
app.include_router(train.router)
app.include_router(models.router)
