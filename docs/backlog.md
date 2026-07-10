# NOVA — Faz 5 Aday Listesi (Backlog)

Faz 1–4 kapsamı dışında kalan, ileride değerlendirilebilecek fikirler. Bu dosya
bir **öneri havuzudur**; buradaki hiçbir madde onaysız uygulanmaz.

## Kalıcılık & Ölçek
- **Kalıcı depolama:** veri setleri ve modeller şu an bellekte (dict, LRU ~20).
  Diske/DB'ye kalıcılık (ör. joblib ile model, parquet ile veri).
- **Toplu tahminde sunucu-taraflı streaming:** çok büyük CSV'lerde tüm satırları
  belleğe/JSON'a almak yerine akışla işleme + doğrudan CSV yanıtı.

## Model & Metrik
- **Permutation importance** (mevcut: ağaç/doğrusal katsayı tabanlı önem).
- **ROC / PR eğrisi** ve eşik ayarı (sınıflandırma).
- **Çapraz doğrulama** ve basit **hiperparametre ayarı**.
- **Model karşılaştırma ekranı:** birden çok modeli yan yana metrikle.
- **Datetime özellik mühendisliği** (şu an datetime kategorik muamelesi görüyor).

## Tahmin UX
- **"Örnek satırla doldur":** tahmin formunu kaynak veri setinden örnek bir
  satırla doldur. Kaynak veri gerektirir → tahliye olduysa `MODEL_DATASET_EVICTED`
  hatasını **gerçekten** tetikler (Faz 4'te bu kod yalnızca savunmacı ele alınıyor).
- **Tahmin geçmişi:** yapılan tekil tahminlerin oturum içi listesi.
- **Güven aralığı (regresyon):** residual std'den tahmin aralığı.

## Navigasyon & Cila
- **Sol ikon navigasyon rayı** (CLAUDE.md yerleşim notunda geçiyor; Faz 4'te
  minimal linklerle idare edildi).
- **Model silme / yeniden adlandırma.**
- **Karanlık/aydınlık ince ayar** — (not: NOVA yalnızca karanlık tema, bu düşük
  öncelik).
