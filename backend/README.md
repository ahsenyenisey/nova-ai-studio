---
title: NOVA API
emoji: 🛰️
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# NOVA API — Backend

FastAPI + scikit-learn servisi (CSV yükleme, EDA, model eğitimi, tahmin).
Bu klasör aynı zamanda bir **Hugging Face Spaces (Docker SDK)** uygulamasıdır;
yukarıdaki frontmatter Space yapılandırmasıdır (`app_port: 7860`).

## Yerel çalıştırma

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000/api/health
```

## Ortam değişkenleri

- `ALLOWED_ORIGINS` — CORS için ek origin'ler (virgülle ayrılmış). `localhost:3000`
  ve tüm `*.vercel.app` alt alan adları zaten kabul edilir.

Deploy adımları için bkz. [`../docs/deploy.md`](../docs/deploy.md).
