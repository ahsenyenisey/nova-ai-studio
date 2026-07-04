"""NOVA API — FastAPI uygulaması.

Faz 1: yalnızca sağlık kontrolü (/api/health). Veri yükleme, EDA, eğitim ve
tahmin endpoint'leri sonraki fazlarda eklenecek (bkz. docs/api-contract.md).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="NOVA API", version="0.1.0")

# Frontend geliştirme sunucusu (Next.js) için CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Servisin ayakta olduğunu doğrular."""
    return {"status": "ok", "service": "nova-api"}
