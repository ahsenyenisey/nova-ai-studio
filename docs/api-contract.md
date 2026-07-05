# NOVA — API Sözleşmesi

Backend base URL (geliştirme): `http://localhost:8000`

Tüm hatalar şu formatta döner:

```json
{ "error": { "code": "string", "message": "string" } }
```

**Hata kodları:** `FILE_TOO_LARGE` (413), `EMPTY_FILE` (400),
`INVALID_ENCODING` (400), `INVALID_CSV` (400), `DATASET_NOT_FOUND` (404).

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

## Planlanan Endpoint'ler (Faz 3+)

| Endpoint | Faz | Açıklama |
|----------|-----|----------|
| `POST /api/train` | Faz 3 | `{ dataset_id, target_column, model_type }` → metrikler. |
| `POST /api/predict` | Faz 4 | `{ model_id, features }` → tahmin + güven skoru. |
| `GET /api/models` | Faz 4 | Eğitilmiş modellerin listesi. |

> Not: Veri setleri ve modeller MVP'de bellekte (dict) tutulur; kalıcılık Faz 4'te.
> Bellek koruması için en fazla 20 veri seti saklanır (LRU).
