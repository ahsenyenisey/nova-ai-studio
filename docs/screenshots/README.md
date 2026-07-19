# Ekran Görüntüleri

Ana README bu klasördeki 4 görsele referans verir:

| Dosya | İçerik | Sayfa |
|-------|--------|-------|
| `landing.png` | Sinematik giriş (NOVA başlığı + CTA) | `/` |
| `eda.png` | Otomatik EDA dashboard'u | `/studio/eda/[id]` |
| `train.png` | Model eğitimi (gerçek adımlı SSE günlüğü + öneri rozeti) | `/studio/train/[id]` |
| `predict.png` | Tahmin (dramatik reveal + güven) | `/studio/predict/[id]` |
| `metrics.png` | Metrikler + confusion matrix + ROC/AUC eğrisi | `/studio/train/[id]` |
| `models.png` | Model listesi + sol nav rayı | `/studio/models` |

Görüntüler 1440×860 viewport'ta, 2x (retina) ölçekle, karanlık temada alınmıştır.
Yenilemek için backend + frontend'i çalıştırıp Playwright ile sayfaları gezip
ekran görüntüsü alan bir script kullanılabilir (upload + train API'den, form
etkileşimleri sayfada).
