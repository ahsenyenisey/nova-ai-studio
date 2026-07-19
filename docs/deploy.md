# NOVA — Ücretsiz Canlıya Alma Rehberi

**Mimari:** frontend → **Vercel**, backend → **Render** (ücretsiz web servisi).
Backend durumu bellekte tuttuğu için sürekli çalışan bir sunucu gerekir; Render'ın
ücretsiz katmanı bunu karşılar. (Hugging Face ücretsiz katmanı artık CPU/Docker
için PRO istediğinden uygun değil.)

> **Notlar:** Render ücretsiz servisi ~15 dk atıl kalınca uyur (ilk istekte
> ~30-60s soğuk başlangıç) ve ~512MB RAM verir; küçük CSV'lerle demo için yeterli.
> Modeller/veri bellekte tutulur → servis uyuyunca sıfırlanır; tek oturumda
> yükle → EDA → eğit → tahmin akışı sorunsuz çalışır. Kalıcılık backlog'da.

---

## 1) Backend → Render

1. [render.com](https://render.com) → **Get Started** → **GitHub ile** giriş yap
   (ücretsiz; kart istemez).
2. Dashboard → **New +** → **Blueprint**.
3. `ahsenyenisey/nova-ai-studio` reposunu seç → Render kökteki **`render.yaml`**'ı
   okur (Docker web servisi, `backend/` kökü, ücretsiz plan).
4. **Apply / Create** → Render imajı build eder (~birkaç dk; sklearn/pandas kurulur).
5. Bitince URL: `https://nova-api-XXXX.onrender.com`. Test:
   `https://nova-api-XXXX.onrender.com/api/health` → `{"status":"ok"}`.

## 2) Frontend → Vercel

1. [vercel.com](https://vercel.com) → GitHub ile giriş.
2. **Add New → Project → `ahsenyenisey/nova-ai-studio`** import et.
3. **Root Directory = `frontend`** seç (Vercel Next.js'i otomatik algılar).
4. **Environment Variables** (build'den önce!):
   - `NEXT_PUBLIC_API_URL = https://nova-api-XXXX.onrender.com` (Render URL'in)
5. **Deploy** → `https://<proje>.vercel.app` canlı.

CORS: backend tüm `*.vercel.app` alt alan adlarını otomatik kabul eder → ek ayar
gerekmez. Özel domain kullanırsan Render'da `ALLOWED_ORIGINS` env'ine ekle.

## 3) Doğrulama

Vercel URL'sini aç → landing → **Veri Yükle** → CSV yükle → EDA → **Model Eğit**
→ **Tahmin**. İlk istek, Render servisi uykudaysa ~30-60s sürebilir (soğuk
başlangıç); sonrası hızlı. Tarayıcı konsolunda CORS/ağ hatası olmamalı.

---

## Güncelleme
- GitHub'a her push'ta: **Render** backend'i, **Vercel** frontend'i otomatik
  yeniden deploy eder (`autoDeploy`).
