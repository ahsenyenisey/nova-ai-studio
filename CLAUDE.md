# CLAUDE.md — NOVA: AI Destekli Veri Analiz Stüdyosu

## Proje Vizyonu

NOVA, kullanıcının CSV verisi yükleyip otomatik keşifsel veri analizi (EDA),
makine öğrenmesi model eğitimi ve tahmin yapabildiği, **sinematik ve premium**
hissiyatlı bir web uygulamasıdır. Hedef: bir veri bilimi aracından çok,
bir bilim kurgu filminin komuta merkezi gibi hissettirmek.

Bu dosya projenin anayasasıdır. Her oturumda buradaki kurallara uy.
Emin olmadığın mimari kararlarda önce plan sun, onay al, sonra kod yaz.

---

## Teknoloji Yığını (Stack)

### Backend
- **Python 3.14 / FastAPI** — REST API
- **pandas 3.0, numpy 2.5** — veri işleme
- **scikit-learn 1.9** — ML modelleri (RandomForest, GradientBoosting, LinearRegression, LogisticRegression)
- **pydantic 2.13 (v2)** — şema doğrulama
- **uvicorn** — geliştirme sunucusu

> Sürüm notu: Python 3.14 kullanılır; eski (pre-wheel) sürümler 3.14 altında
> kaynaktan derlenmeye çalışıp patlar (ör. `pydantic-core` / PyO3). Bağımlılıklar
> `backend/requirements.txt` içinde 3.14 wheel'i olan sürümlere sabitlenmiştir.

### Frontend
- **Next.js 16 (App Router, Turbopack varsayılan) + TypeScript**
- **Tailwind CSS v4** — CSS-first yapılandırma; tasarım tokenları `globals.css`
  içinde `@theme` bloğunda tanımlanır (ayrı `tailwind.config.js` yok)
- **Framer Motion** — tüm animasyonlar (zorunlu, CSS animasyonu yerine bunu kullan)
- **Recharts** — grafikler
- **lucide-react** — ikonlar

### Kurallar
- Backend `backend/`, frontend `frontend/` klasöründe yaşar.
- API sözleşmesi `docs/api-contract.md` dosyasında tutulur ve her endpoint
  değişikliğinde güncellenir.
- Python tarafında type hint zorunlu; frontend'de `any` tipi yasak.
- Her ML fonksiyonu için en az bir pytest testi yaz.
- **Plandan sapma olursa CLAUDE.md'yi de aynı commit'te güncelle.** Onaylı plandan
  veya bu dosyadaki karar/sürümlerden ayrılan her değişiklik (sürüm yükseltme,
  farklı kütüphane, mimari değişiklik) ilgili CLAUDE.md bölümüyle birlikte
  commit'lenir; kod ile anayasa asla ayrışmaz.

---

## Sinematik UI/UX Tasarım Sistemi

### Genel Estetik: "Deep Space Observatory"
Karanlık, derin, atmosferik. Kullanıcı bir uzay gözlemevinin komuta
panelindeymiş gibi hissetmeli. Asla sıradan bir admin template'ine benzeme.

### Renk Paleti
```
--bg-void:        #05060f   (ana arkaplan — neredeyse siyah, mavi alt ton)
--bg-nebula:      #0b0e1f   (panel arkaplanları)
--surface-glass:  rgba(255,255,255,0.04)  (glassmorphism yüzeyler)
--border-glow:    rgba(120,140,255,0.15)  (panel kenarları)
--primary:        #6c7bff   (elektrik moru-mavisi — ana aksiyon rengi)
--accent-cyan:    #4ee1d0   (veri vurguları, pozitif metrikler)
--accent-amber:   #ffb454   (uyarılar, dikkat çekiciler)
--danger:         #ff5c7a   (hatalar, negatif metrikler)
--text-primary:   #e8eaf6
--text-muted:     #8b90b3
```

### Tipografi
- Başlıklar: **Space Grotesk** (Google Fonts) — geniş letter-spacing (0.02em)
- Gövde: **Inter**
- Sayılar/metrikler: **JetBrains Mono** — tabular-nums ile

### Sinematik Efekt Kuralları
1. **Glassmorphism paneller:** `backdrop-blur-xl`, ince parlayan kenarlıklar,
   hafif iç gölge. Hover'da kenar parlaması güçlenir (glow intensify).
2. **Sayfa geçişleri:** Framer Motion `AnimatePresence` ile fade + subtle
   scale (0.98 → 1). Süre: 0.5s, easing: `[0.22, 1, 0.36, 1]`.
3. **Sayı animasyonları:** Tüm metrikler 0'dan hedef değere sayarak yükselir
   (count-up), 1.2s süre.
4. **Grafik girişleri:** Grafikler ekrana girdiğinde çizgiler soldan sağa
   "çizilerek" belirir, barlar aşağıdan yükselir. Staggered delay: 80ms.
5. **Arkaplan atmosferi:** Ana sayfada çok yavaş hareket eden, düşük opaklıklı
   gradient orb'lar (blur-3xl, animate 20s+). Performansı bozmayacak şekilde
   CSS transform ile, asla layout tetikleme.
6. **Yükleme durumları:** Spinner yerine "veri taranıyor" hissi veren
   skeleton + pulse dalgası. Model eğitilirken ilerleme, terminal benzeri
   akan log satırlarıyla gösterilir (typewriter efekti).
7. **Mikro etkileşimler:** Butonlarda hover'da hafif yükselme (y: -2px) +
   glow; tıklamada scale 0.97. Kartlarda hover'da 3D tilt (max 4 derece).
8. **Ses yok, titreme yok:** Animasyonlar zarif ve yavaş olmalı (asla 150ms
   altı sert geçiş). `prefers-reduced-motion` desteği zorunlu.

### Yerleşim
- Sol tarafta dar, ikon tabanlı navigasyon rayı (hover'da genişler).
- Ana içerik alanı: 12 kolonlu grid, paneller arası 24px boşluk.
- Üstte ince bir "durum çubuğu": aktif veri seti adı, satır sayısı, model durumu.

---

## Sayfa Yapısı

1. **/ (Landing / Hero):** Tam ekran sinematik giriş. Büyük başlık harf harf
   belirir, arkada nebula gradyanları. "Veri Yükle" CTA butonu.
2. **/studio (Ana Stüdyo):** CSV yükleme (drag & drop, sürüklerken alan
   parlar), yüklenince otomatik EDA paneline geçiş.
3. **/studio/eda:** Otomatik analiz — sütun tipleri, eksik değer haritası,
   dağılım grafikleri, korelasyon ısı haritası. Her panel staggered animasyonla girer.
4. **/studio/train:** Hedef sütun + model seçimi, eğitim ilerlemesi
   (terminal log estetiği), sonuç metrikleri (accuracy/R², confusion matrix
   veya residual plot).
5. **/studio/predict:** Form tabanlı tekil tahmin + toplu CSV tahmini,
   sonuçlar dramatik bir "reveal" animasyonuyla gösterilir.

---

## API Endpoint'leri

```
POST /api/upload          → CSV yükle, özet döndür (sütunlar, tipler, satır sayısı)
GET  /api/eda/{dataset_id}→ EDA sonuçları (istatistikler, korelasyon, eksik değerler)
POST /api/train           → { dataset_id, target_column, model_type } → metrikler
POST /api/predict         → { model_id, features } → tahmin + güven skoru
GET  /api/models          → eğitilmiş modellerin listesi
```

- Veri setleri ve modeller MVP'de bellekte (dict) tutulur; kalıcılık Faz 4'te.
- Tüm hatalar `{ "error": { "code": str, "message": str } }` formatında döner.
- Maksimum CSV boyutu: 20MB. Aşımda anlamlı hata mesajı.

---

## Geliştirme Fazları

Her fazı ayrı ayrı iste; faz bitmeden sonrakine geçme.

- **Faz 1 — İskelet:** Monorepo yapısı, FastAPI "hello" endpoint'i, Next.js
  kurulumu, tasarım sistemi (renkler, fontlar, temel Panel/Button bileşenleri),
  sinematik landing page.
- **Faz 2 — Veri Yükleme + EDA:** Upload endpoint'i, drag & drop arayüzü,
  otomatik EDA hesaplamaları ve animasyonlu EDA dashboard'u.
- **Faz 3 — Model Eğitimi:** Train endpoint'i (problem tipini otomatik algıla:
  hedef sayısal → regresyon, kategorik → sınıflandırma), eğitim ekranı,
  metrik panelleri.
- **Faz 4 — Tahmin + Cila:** Predict akışı, model listesi, boş durum (empty
  state) tasarımları, hata durumları, `prefers-reduced-motion`, responsive
  düzeltmeler, README.

---

## Komutlar

```bash
# Backend
cd backend && uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm run dev

# Testler
cd backend && pytest -q
cd frontend && npm run lint && npx tsc --noEmit
```

Her fazın sonunda testleri ve lint'i çalıştır; hepsi geçmeden fazı
"tamamlandı" sayma.

---

## Yapma Listesi (Anti-Pattern'ler)

- Bootstrap/hazır admin teması KULLANMA — her bileşen tasarım sistemine göre elle yazılır.
- Açık (light) tema ekleme; NOVA yalnızca karanlık temadır.
- console.log bırakma, ölü kod bırakma.
- Tek dosyaya 300 satırdan fazla bileşen yazma; parçala.
- Kullanıcı verisini asla diske log'lama.
- Emoji tabanlı ikon kullanma; yalnızca lucide-react.
