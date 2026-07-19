# NOVA — Ücretsiz Canlıya Alma Rehberi

**Mimari:** frontend → **Vercel**, backend → **Hugging Face Spaces (Docker)**.
İkisi de ücretsiz ve kartsız. Yapılandırma repoda hazır; aşağıdaki adımlar
hesap/deploy içindir.

> **Not (durum kalıcılığı):** Modeller ve veri setleri bellekte tutulur; ücretsiz
> hostlar atıl kalınca uyur ve durum sıfırlanır. Tek oturumda **yükle → EDA →
> eğit → tahmin** akışı sorunsuz çalışır (demo için yeterli). Kalıcılık backlog'da.

---

## 1) Backend → Hugging Face Spaces

1. [huggingface.co](https://huggingface.co) hesabı aç (ücretsiz).
2. **New → Space**: bir ad ver (ör. `nova-ai-studio`), **SDK = Docker**,
   görünürlük Public, **Create Space**.
3. Space'in git remote'una **yalnızca `backend/` içeriğini** push et:
   ```bash
   # repo kökünde
   git clone https://huggingface.co/spaces/<KULLANICI>/nova-ai-studio hf-space
   cp -R backend/. hf-space/          # Dockerfile + README(HF) + kod Space köküne
   cd hf-space
   git add -A && git commit -m "NOVA API"
   git push
   ```
   (HF şifre yerine **Access Token** ister: Settings → Access Tokens → *write*.)
4. Space otomatik build eder (~birkaç dk). Bitince URL:
   `https://<KULLANICI>-nova-ai-studio.hf.space`
5. Test: `https://<KULLANICI>-nova-ai-studio.hf.space/api/health` → `{"status":"ok"}`.

## 2) Frontend → Vercel

1. [vercel.com](https://vercel.com) hesabı aç, GitHub ile bağlan.
2. **Add New → Project → `ahsenyenisey/nova-ai-studio`** import et.
3. **Root Directory = `frontend`** seç (Vercel Next.js'i otomatik algılar).
4. **Environment Variables** ekle (build'den önce!):
   - `NEXT_PUBLIC_API_URL = https://<KULLANICI>-nova-ai-studio.hf.space`
5. **Deploy**. Frontend URL: `https://<proje>.vercel.app`.

CORS: backend tüm `*.vercel.app` alt alan adlarını otomatik kabul eder → ek ayar
gerekmez. Özel domain kullanırsan Space'te `ALLOWED_ORIGINS` env'ine ekle.

## 3) Doğrulama

Vercel URL'sini aç → landing → **Veri Yükle** → bir CSV yükle → EDA → **Model
Eğit** → **Tahmin**. Tarayıcı konsolunda CORS/ağ hatası olmamalı. (İlk istek,
Space uykudaysa ~30-60s sürebilir — soğuk başlangıç.)

---

## Güncelleme
- **Backend:** `backend/` değişince `hf-space`'e tekrar `cp -R backend/. hf-space/`
  + commit + push → Space yeniden build eder.
- **Frontend:** GitHub'a push → Vercel otomatik yeniden deploy eder.
