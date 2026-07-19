# NOVA — Backlog

Bu dosya bir **öneri havuzudur**; buradaki hiçbir madde onaysız uygulanmaz.

## Faz 5'te uygulandı ✅
Cross-validation, ROC/AUC eğrisi (ikili), hiperparametre ayarı (GridSearchCV),
permutation importance, regresyon güven aralığı, sol sinematik nav rayı, tahmin
geçmişi, "örnek satırla doldur", model silme, model karşılaştırma.

## Açık maddeler

### Kalıcılık & Ölçek
- **Kalıcı depolama:** veri setleri ve modeller bellekte (dict, LRU ~20).
  Diske/DB'ye kalıcılık (joblib ile model, parquet ile veri).
- **Toplu tahminde sunucu-taraflı streaming:** çok büyük CSV'lerde satırları
  akışla işleme + doğrudan CSV yanıtı.

### Model & Metrik
- **Çok sınıflı ROC eğrisi** (şu an çok sınıfta yalnızca macro-OVR AUC).
- **Datetime özellik mühendisliği** (şu an datetime kategorik muamelesi görüyor).
- **Zaman serisi** desteği.

### UX & Yönetim
- **Model yeniden adlandırma / etiketleme.**
- **Deploy:** Docker + dağıtım (frontend Vercel, backend bir host) → canlı demo.
- **Aydınlık tema** — (düşük öncelik; NOVA yalnızca karanlık tema).
