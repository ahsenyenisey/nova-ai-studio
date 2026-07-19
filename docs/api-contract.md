# NOVA — API Sözleşmesi

Backend base URL (geliştirme): `http://localhost:8000`

Tüm hatalar şu formatta döner:

```json
{ "error": { "code": "string", "message": "string" } }
```

**Hata kodları:** `FILE_TOO_LARGE` (413), `EMPTY_FILE` (400),
`INVALID_ENCODING` (400), `INVALID_CSV` (400), `DATASET_NOT_FOUND` (404),
`INVALID_TARGET` (400), `MODEL_NOT_FOUND` (404), `MODEL_DATASET_EVICTED` (409),
`MISSING_FEATURES` (400).

---

## Aktif Endpoint'ler (Faz 1–2)

### `GET /api/health`

Servisin ayakta olduğunu doğrular.

**Yanıt `200 OK`** · `{ "status": "ok", "service": "nova-api" }`

---

### `POST /api/upload`

CSV yükler, doğrular, bellekte saklar ve **özet** döndürür (EDA hesaplamaz).

- **İstek:** `multipart/form-data`, alan adı `file` (bir `.csv`).
- **Limit:** 20MB. Aşımda `FILE_TOO_LARGE`.
- **Encoding:** sırayla `utf-8` → `utf-8-sig` → `windows-1254` denenir; kullanılan
  kodlama `encoding` alanında döner. windows-1254 ile `�` oranı %1'i aşarsa
  `INVALID_ENCODING`.
- **Boş / yalnızca başlık:** `EMPTY_FILE`. Ayrıştırılamayan içerik: `INVALID_CSV`.

**Yanıt `200 OK`**

```json
{
  "dataset_id": "eae29fdf8dba4087a3769efa6c72d3c7",
  "filename": "good.csv",
  "encoding": "utf-8",
  "n_rows": 5,
  "n_cols": 4,
  "columns": [
    { "name": "age", "dtype": "int64", "inferred_type": "numeric" },
    { "name": "city", "dtype": "str", "inferred_type": "categorical" }
  ],
  "preview": [ { "age": "30", "city": "Istanbul" } ]
}
```

`inferred_type` ∈ `numeric | boolean | datetime | categorical`.

---

### `GET /api/eda/{dataset_id}`

**Tam EDA.** Özet istatistikler **tüm** sütunlar için; grafik verisi (korelasyon +
dağılımlar) varsayılan olarak normalize varyansı en yüksek **15 sayısal** sütun
için. İlk çağrıda hesaplanıp cache'lenir. Bilinmeyen id → `DATASET_NOT_FOUND`.

**Yanıt `200 OK`** (kısaltılmış)

```json
{
  "dataset_id": "…", "filename": "wide.csv", "encoding": "utf-8",
  "n_rows": 200, "n_cols": 21,
  "column_stats": [
    {
      "name": "feat_3", "inferred_type": "numeric",
      "missing_count": 29, "missing_ratio": 0.145,
      "mean": 2.82, "median": 2.9, "std": 1.6, "min": -4.0, "max": 8.2,
      "unique_count": null, "top_values": null
    },
    {
      "name": "category", "inferred_type": "categorical",
      "missing_count": 0, "missing_ratio": 0.0,
      "unique_count": 3,
      "top_values": [ { "value": "A", "count": 70 } ]
    }
  ],
  "missing_map": [ { "name": "feat_3", "missing_ratio": 0.145 } ],
  "charts": {
    "selected_columns": ["feat_9", "feat_19", "…"],
    "total_numeric": 20,
    "hidden_numeric_count": 5,
    "correlation_available": true,
    "correlation_reason": null,
    "correlation": {
      "columns": ["feat_9", "feat_19"],
      "values": [ [1.0, 0.02], [0.02, 1.0] ]
    },
    "distributions": [
      {
        "name": "feat_9", "inferred_type": "numeric",
        "bins": [ { "start": -4.1, "end": -1.7, "count": 3 } ],
        "categories": null, "other_count": null
      }
    ]
  }
}
```

**Kenar durumlar:** <2 sayısal sütun (tek sütun dahil) → `correlation_available:
false`, `correlation: null`, `correlation_reason` doldurulur; hata değildir.

---

### `GET /api/eda/{dataset_id}/columns?include=a,b,c`

Kullanıcının seçtiği sayısal alt küme için **yalnızca grafik verisi** döndürür
(yukarıdaki `charts` ile aynı `ChartData` şeması). "Sütunları düzenle" akışında
çağrılır. `include` virgülle ayrılmış sütun adları; verilmezse varsayılan seçim
uygulanır. Geçersiz/sayısal-olmayan adlar yok sayılır.

---

## Model Eğitimi & Tahmin (Faz 3)

### `GET /api/train/target/{dataset_id}?column=`

Hedef sütun analizi + problem tipi önerisi (öneri; UI rozette gerekçe gösterir).

```json
{
  "column": "churn", "inferred_type": "numeric", "unique_count": 2,
  "sample_values": ["0", "1"], "trainable": true,
  "suggested_problem_type": "classification", "tone": "confident",
  "reason": "Az sayıda tam sayı değeri (2 benzersiz) → sınıflandırma önerilir.",
  "error": null
}
```
Kural: kategorik/boolean → sınıflandırma; sayısal → regresyon, **ancak** tam sayı
ve benzersiz ≤10 → sınıflandırma önerilir (`tone`: `confident`|`unsure`). Hedef
tek-değerli veya (ID gibi) tümü benzersiz kategorik → `trainable:false`,
`error.code = INVALID_TARGET`.

### `POST /api/train`  →  **SSE** (`text/event-stream`)

Body: `{ dataset_id, target_column, model_type, problem_type? }`.
`model_type` ∈ `random_forest | gradient_boosting | linear`. `problem_type` verilirse
öneriyi override eder (uyumsuzsa `INVALID_TARGET`, akış başlamadan). Split
`test_size=0.2`, `random_state=42`, sınıflandırmada stratify; **metrikler test
setinden**. Her olay:

```
data: {"stage":"validate","message":"Veri doğrulanıyor","progress":0.05}
data: {"stage":"split","message":"...","progress":0.2,"n_train":64,"n_test":16}
data: {"stage":"train","message":"...200 ağaç","progress":0.85,"trees_built":200,"trees_total":200}
data: {"stage":"done","message":"Eğitim tamamlandı","progress":1.0,"model_id":"...","detail":{...ModelDetail}}
```
Aşamalar gerçek işe karşılık gelir (sahte log yok); ensemble'da `warm_start` ile
gerçek ağaç ilerlemesi. Beklenmeyen hatada `{"stage":"error", ...}`.

### `GET /api/models` · `GET /api/models/{id}` · `GET /api/models/{id}/importance?limit=`

Model özet listesi / detay (metrikler, feature şeması, top-N importance) / importance
("gerisi istek üzerine" — `limit` yoksa hepsi). Özette `source_dataset_available`
kaynak veri setinin hâlâ bellekte olup olmadığını bildirir.

**Metrikler:** sınıflandırma → accuracy, f1, precision, recall (weighted) + confusion
matrix; regresyon → R², MAE, RMSE + residual noktaları.

### `POST /api/predict`  (minimal — Faz 4'te UI/batch/güven detayı)

Body: `{ model_id, features: { sütun: değer } }`. Saklı pipeline ile tahmin
(self-contained → kaynak veri düşse de çalışır).

```json
{
  "model_id": "...", "problem_type": "classification",
  "prediction": "1", "probabilities": {"0": 0.12, "1": 0.88},
  "confidence": 0.88, "warnings": []
}
```
Regresyonda `prediction` sayı, `probabilities`/`confidence` null. Eğitimde
görülmemiş kategori → `warnings` alanında açıkça bildirilir (sessiz bozulma yok).

### `POST /api/predict/batch`  (toplu CSV tahmini — Faz 4)

`multipart/form-data`: `model_id` (form alanı) + `file` (CSV). 20MB limiti ve
encoding zinciri `/api/upload` ile aynı. Modelin beklediği bir feature sütunu
eksikse → `MISSING_FEATURES` (eksik sütunlar listelenir).

```json
{
  "model_id": "...", "problem_type": "classification",
  "prediction_column": "tahmin",
  "columns": ["id", "age", "city", "plan", "tahmin", "güven"],
  "rows": [ { "id": 1, "age": 60, "city": "Ist", "plan": "C",
             "tahmin": "1", "güven": 0.99 } ],
  "n_rows": 1, "warnings": []
}
```
`rows` yüklenen CSV'nin **tüm** orijinal sütunlarını korur (id gibi) + `tahmin`
(sınıflandırmada ayrıca `güven`) sütunu. Bilinmeyen kategoriler `warnings`'te
sütun bazında toplanır. Sonuç JSON'dur; CSV indirme istemci tarafında üretilir.

> Not: Veri setleri ve modeller MVP'de bellekte (dict, LRU ~20) tutulur; model
> kayıtları self-contained (fit'li pipeline + feature şeması + tüm importance).
> Kalıcılık ileride.

---

## Faz 5 — ML derinliği + ek uçlar

**`POST /api/train`** artık `tune: bool` (varsayılan false) kabul eder → küçük bir
grid ile `GridSearchCV`. Yeni SSE aşamaları **`cv`** (çapraz doğrulama) ve **`tune`**.
`ModelDetail`/`ModelSummary` genişledi:
- `cv`: `{ mean, std, folds, metric }` — k-fold çapraz doğrulama skoru.
- `best_params`: ayar açıksa en iyi hiperparametreler (yoksa null).
- `has_permutation`: permutation importance mevcut mu.
- `classification.auc`, `classification.roc` (`{ points:[{fpr,tpr}], auc, positive_label }`;
  ikili sınıfta eğri, çok sınıflıda yalnızca AUC).
- `regression.residual_std` → tahminde güven aralığı.

**`POST /api/predict`** regresyonda `interval: { low, high }` (~%95, residual std'den)
döndürür. `POST /api/predict/batch` regresyonda `alt`/`üst` sütunları ekler.

| Endpoint | İş |
|----------|----|
| `GET /api/models/{id}/importance?method=model\|permutation` | Model-tabanlı veya permutation importance (top-N + `limit`). |
| `GET /api/models/{id}/sample-row` | Kaynak veriden rastgele bir satırın feature değerleri (`{ values }`). Veri düşmüşse **`MODEL_DATASET_EVICTED`** (409). |
| `DELETE /api/models/{id}` | Modeli sil (`204`; yoksa `MODEL_NOT_FOUND`). |
