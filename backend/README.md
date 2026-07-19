# NOVA API — Backend

FastAPI + scikit-learn servisi (CSV yükleme, EDA, model eğitimi, tahmin).

## Yerel çalıştırma

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000/api/health
```

## Docker

```bash
docker build -t nova-api .
docker run -p 8000:8000 -e PORT=8000 nova-api
```

## Ortam değişkenleri

- `PORT` — dinlenecek port (host tarafından verilir; yoksa 7860).
- `ALLOWED_ORIGINS` — CORS için ek origin'ler (virgülle ayrılmış). `localhost:3000`
  ve tüm `*.vercel.app` alt alan adları zaten kabul edilir.

Ücretsiz deploy adımları için bkz. [`../docs/deploy.md`](../docs/deploy.md).
