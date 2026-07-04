# NOVA — API Sözleşmesi

Backend base URL (geliştirme): `http://localhost:8000`

Tüm hatalar şu formatta döner:

```json
{ "error": { "code": "string", "message": "string" } }
```

---

## Faz 1 — Aktif Endpoint'ler

### `GET /api/health`

Servisin ayakta olduğunu doğrular.

**Yanıt `200 OK`**

```json
{ "status": "ok", "service": "nova-api" }
```

---

## Faz 2+ — Planlanan Endpoint'ler (henüz uygulanmadı)

Aşağıdaki endpoint'ler CLAUDE.md'de tanımlıdır; ilgili fazda eklenecektir.

| Endpoint | Faz | Açıklama |
|----------|-----|----------|
| `POST /api/upload` | Faz 2 | CSV yükle → özet (sütunlar, tipler, satır sayısı). Maks 20MB. |
| `GET /api/eda/{dataset_id}` | Faz 2 | EDA sonuçları (istatistik, korelasyon, eksik değerler). |
| `POST /api/train` | Faz 3 | `{ dataset_id, target_column, model_type }` → metrikler. |
| `POST /api/predict` | Faz 4 | `{ model_id, features }` → tahmin + güven skoru. |
| `GET /api/models` | Faz 4 | Eğitilmiş modellerin listesi. |

> Not: Veri setleri ve modeller MVP'de bellekte (dict) tutulur; kalıcılık Faz 4'te.
