# NOVA — AI Destekli Veri Analiz Stüdyosu

CSV verisi yükleyip otomatik keşifsel veri analizi (EDA), makine öğrenmesi model
eğitimi ve tahmin yapabildiğin, **sinematik ve premium** hissiyatlı bir web
uygulaması. Estetik: *Deep Space Observatory* — bir uzay gözlemevinin komuta paneli.

Proje anayasası ve tasarım sistemi için bkz. [`CLAUDE.md`](./CLAUDE.md).
API sözleşmesi: [`docs/api-contract.md`](./docs/api-contract.md).

## Teknoloji

- **Backend:** Python 3.11+ / FastAPI, pandas, scikit-learn
- **Frontend:** Next.js 15 (App Router) + TypeScript, Tailwind CSS v4, Framer Motion, Recharts, lucide-react

## Kurulum & Çalıştırma

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000/api/health
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## Testler

```bash
# Backend
cd backend && source .venv/bin/activate && pytest -q

# Frontend
cd frontend && npm run lint && npx tsc --noEmit
```

## Geliştirme Fazları

- **Faz 1 — İskelet** ✅ Monorepo, health endpoint, tasarım sistemi, sinematik landing.
- **Faz 2 — Veri Yükleme + EDA** — Upload, drag & drop, animasyonlu EDA dashboard.
- **Faz 3 — Model Eğitimi** — Train endpoint, eğitim ekranı, metrik panelleri.
- **Faz 4 — Tahmin + Cila** — Predict akışı, model listesi, empty/error state'ler, responsive.
