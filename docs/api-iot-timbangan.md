# Dokumentasi API IoT Timbangan ENTOK

Dokumen ini untuk integrasi ESP32 / firmware timbangan dengan backend ENTOK.

## Ringkasan

Base URL produksi:

```text
https://api-entok.bengkelit.id/api
```

Format data:

```text
Content-Type: application/json
```

Semua berat dikirim dalam satuan kilogram (`kg`).

ESP32 tidak perlu login JWT. ESP32 memakai device key.

Header wajib:

```http
X-Device-Key: entok-2026
Content-Type: application/json
```

Header disarankan:

```http
X-Device-Id: 1
X-Firmware-Version: timbangan1-2026-07-16
```

Untuk Timbangan 2:

```http
X-Device-Id: 2
X-Firmware-Version: timbangan2-...
```

Catatan:

- `X-Device-Key` sekarang masih mendukung key global lama.
- Backend juga bisa membaca `timbangan_id` dari URL, query, atau body.
- Tetap kirim `X-Device-Id` supaya nanti aman saat per-device key dipakai.

## Timbangan 1 - Stok Pakan Fisik

Timbangan 1 dipakai untuk membaca stok aktual satu bahan pakan, misalnya `dedak`.

Saat data masuk dari Timbangan 1:

- backend menyimpan reading timbangan;
- status timbangan menjadi `ONLINE`;
- jika timbangan bertipe `DEDICATED` dan `label` cocok dengan feed, stok feed mengikuti nilai aktual dari timbangan;
- event realtime dikirim ke dashboard.

### 1. Heartbeat Timbangan 1

Dipakai agar dashboard tahu perangkat masih online walaupun berat tidak berubah.

```http
POST /api/timbangan/1/heartbeat
```

Header:

```http
X-Device-Key: entok-2026
X-Device-Id: 1
Content-Type: application/json
```

Payload:

```json
{
  "firmware_version": "timbangan1-2026-07-16"
}
```

Response sukses `200`:

```json
{
  "status": "success",
  "message": "Heartbeat perangkat diterima",
  "data": {
    "id": 1,
    "status": "ONLINE"
  }
}
```

Rekomendasi interval:

```text
30-60 detik
```

### 2. Kirim Reading Stok Timbangan 1

```http
POST /api/timbangan/readings
```

Header:

```http
X-Device-Key: entok-2026
X-Device-Id: 1
Content-Type: application/json
```

Payload:

```json
{
  "timbangan_id": 1,
  "value": 2.4,
  "unit": "kg",
  "label": "dedak"
}
```

Field:

| Field | Wajib | Tipe | Keterangan |
| --- | --- | --- | --- |
| `timbangan_id` | Ya | integer | ID timbangan. Untuk Timbangan 1 pakai `1`. |
| `value` | Ya | number | Berat aktual dalam kg. Tidak boleh negatif. |
| `unit` | Tidak | string | Default `kg`. |
| `label` | Disarankan | string | Nama bahan pakan, misalnya `dedak`. Untuk timbangan `DEDICATED`, backend bisa memakai `default_label` jika kosong. |

Response sukses `201`:

```json
{
  "status": "success",
  "message": "Data pembacaan berhasil disimpan",
  "data": {
    "timbangan_id": 1,
    "value": 2.4,
    "unit": "kg",
    "label": "dedak"
  }
}
```

Rekomendasi firmware:

- Kirim hanya saat berat stabil.
- Jangan kirim setiap loop.
- Kirim jika perubahan minimal sekitar `0.05 kg`.
- Tetap kirim heartbeat walaupun berat tidak berubah.

## Timbangan 2 - Batch Racikan

Timbangan 2 dipakai untuk racikan pakan per fase dan bahan. Timbangan 2 bertipe `MULTI`.

Alur normal:

1. Penjaga menyiapkan batch racikan dari APK atau web.
2. ESP32 mengambil target batch lewat `scale-map`.
3. ESP32 menahan data sampai satu fase lengkap.
4. ESP32 mengirim hasil timbang fase tersebut lewat `scale-readings/bulk`.
5. Web/APK finalisasi batch untuk memotong stok.

Timbangan 2 tidak langsung memotong stok. Stok dipotong saat batch difinalisasi dari APK/web.

### 1. Heartbeat Timbangan 2

```http
POST /api/timbangan/2/heartbeat
```

Header:

```http
X-Device-Key: entok-2026
X-Device-Id: 2
Content-Type: application/json
```

Payload:

```json
{
  "firmware_version": "timbangan2-2026-..."
}
```

Response sukses `200`:

```json
{
  "status": "success",
  "message": "Heartbeat perangkat diterima",
  "data": {
    "id": 2,
    "status": "ONLINE"
  }
}
```

### 2. Ambil Target Batch Timbangan 2

```http
GET /api/feeding-batches/scale-map?timbangan_id=2
```

Header:

```http
X-Device-Key: entok-2026
X-Device-Id: 2
```

Query:

| Query | Wajib | Keterangan |
| --- | --- | --- |
| `timbangan_id` | Tidak | Default `2`. |
| `date` | Tidak | Format `YYYY-MM-DD`. Jika kosong, backend pakai tanggal operasional kandang. |
| `batch_id` | Tidak | Dipakai jika ESP32 sudah punya batch aktif dan ingin validasi ulang. |

Contoh:

```http
GET /api/feeding-batches/scale-map?timbangan_id=2
```

Contoh dengan batch spesifik:

```http
GET /api/feeding-batches/scale-map?timbangan_id=2&batch_id=779cf8a9-2a73-4ff1-a84d-139ebb1c25ad
```

Response sukses `200`:

```json
{
  "status": "success",
  "message": "Scale map Timbangan 2 siap",
  "batch_id": "779cf8a9-2a73-4ff1-a84d-139ebb1c25ad",
  "batch_status": "WEIGHING",
  "date": "2026-07-19",
  "timbangan_id": 2,
  "tolerance_percent": 10.0,
  "total_items": 3,
  "saved_items": 0,
  "items": [
    {
      "kode": 1,
      "ingredient_id": 443,
      "feed_id": "6c846677-19be-4590-82cd-e0366f7666d6",
      "phase_id": "0f8d8f82-3101-4982-9449-42f2feebcecb",
      "phase": "Grower 2 (36-60 Hari)",
      "phase_short": "G2",
      "label": "BSF",
      "label_short": "BSF",
      "target": 0.18,
      "weighed": 0.0,
      "unit": "kg",
      "saved": false,
      "lcd_title": "G2 BSF #01",
      "lcd_target": "T:0.180"
    }
  ]
}
```

Field penting untuk firmware:

| Field | Keterangan |
| --- | --- |
| `batch_id` | Simpan sebagai batch aktif di ESP32. |
| `items[].kode` | Nomor urutan bahan. |
| `items[].ingredient_id` | ID bahan batch. Paling aman dipakai saat kirim hasil timbang. |
| `items[].phase` | Nama fase. |
| `items[].phase_id` | ID fase. |
| `items[].label` | Nama bahan. |
| `items[].target` | Target timbang dalam kg. |
| `items[].weighed` | Berat yang sudah tersimpan di backend. |
| `items[].saved` | `true` jika item sudah pernah masuk. |
| `items[].lcd_title` | Teks pendek untuk LCD. |
| `items[].lcd_target` | Target pendek untuk LCD. |

Jika belum ada batch aktif, backend akan mengembalikan error:

```json
{
  "status": "error",
  "code": "BATCH_NOT_ACTIVE",
  "message": "Belum ada batch racikan misi pakan aktif. Siapkan target racikan dari card tugas Beri Pakan."
}
```

Saran tampilan LCD:

```text
AKTIFKAN
RACIKAN DI APK
```

### 3. Kirim Hasil Timbang Timbangan 2 Secara Bulk

Endpoint utama untuk ESP32 Timbangan 2:

```http
POST /api/feeding-batches/scale-readings/bulk
```

Header:

```http
X-Device-Key: entok-2026
X-Device-Id: 2
Content-Type: application/json
```

Payload yang disarankan:

```json
{
  "request_id": "2-5-a1b2c3d4",
  "batch_id": "779cf8a9-2a73-4ff1-a84d-139ebb1c25ad",
  "timbangan_id": 2,
  "mode": "SET",
  "unit": "kg",
  "scope": "PHASE",
  "phase": "Grower 2 (36-60 Hari)",
  "items": [
    {
      "ingredient_id": 443,
      "feed_name": "BSF",
      "phase": "Grower 2 (36-60 Hari)",
      "value": 0.18,
      "planned_amount": 0.18
    },
    {
      "ingredient_id": 444,
      "feed_name": "dedak",
      "phase": "Grower 2 (36-60 Hari)",
      "value": 0.36,
      "planned_amount": 0.36
    },
    {
      "ingredient_id": 445,
      "feed_name": "jagung",
      "phase": "Grower 2 (36-60 Hari)",
      "value": 0.06,
      "planned_amount": 0.06
    }
  ]
}
```

Field top-level:

| Field | Wajib | Keterangan |
| --- | --- | --- |
| `request_id` | Disarankan kuat | ID unik per pengiriman. Dipakai agar retry tidak dobel. Minimal 8 karakter. |
| `batch_id` | Disarankan kuat | ID batch dari `scale-map`. |
| `timbangan_id` | Tidak | Default `2`, tetapi tetap kirim untuk jelas. |
| `mode` | Tidak | `SET` atau `ADD`. Untuk ESP32 pakai `SET`. |
| `unit` | Tidak | `kg`. |
| `scope` | Tidak | Metadata firmware. Backend mengabaikan field ekstra, aman dikirim. |
| `phase` | Tidak | Metadata fase. Yang dipakai utama tetap item-level `phase`/`phase_id`. |
| `items` | Ya | Minimal 1 item. |

Field item:

| Field | Wajib | Keterangan |
| --- | --- | --- |
| `ingredient_id` | Disarankan kuat | ID bahan dari `scale-map`. Paling aman untuk menghindari salah label/fase. |
| `feed_name` atau `label` | Wajib jika tidak ada `ingredient_id` | Nama bahan. |
| `phase` atau `phase_id` | Wajib jika tidak ada `ingredient_id` | Fase bahan. |
| `value` atau `amount` | Ya | Berat aktual hasil timbang dalam kg. |
| `planned_amount` | Tidak | Target bahan, untuk referensi. |
| `unit` | Tidak | Jika kosong ikut top-level `unit`. |
| `mode` | Tidak | Jika kosong ikut top-level `mode`. |
| `kode` | Tidak | Nomor urut dari LCD/keypad. |

Response sukses `200`:

```json
{
  "status": "success",
  "message": "3 data racikan dari timbangan berhasil masuk ke batch",
  "data": {
    "id": "779cf8a9-2a73-4ff1-a84d-139ebb1c25ad",
    "status": "READY_TO_FINALIZE"
  },
  "applied_items": [
    {
      "ingredient_id": 443,
      "feed_name": "BSF",
      "phase": "Grower 2 (36-60 Hari)",
      "value": 0.18,
      "unit": "kg"
    }
  ]
}
```

Jika request yang sama dikirim ulang dengan `request_id` dan payload sama, backend bisa mengembalikan response replay:

```json
{
  "status": "success",
  "message": "3 data racikan dari timbangan berhasil masuk ke batch",
  "idempotent_replay": true
}
```

### 4. Kirim Satu Reading Timbangan 2

Endpoint ini tersedia, tetapi untuk firmware ESP32 disarankan pakai bulk.

```http
POST /api/feeding-batches/scale-readings
```

Payload:

```json
{
  "request_id": "2-single-0001",
  "batch_id": "779cf8a9-2a73-4ff1-a84d-139ebb1c25ad",
  "timbangan_id": 2,
  "ingredient_id": 443,
  "feed_name": "BSF",
  "phase": "Grower 2 (36-60 Hari)",
  "value": 0.18,
  "unit": "kg",
  "mode": "SET"
}
```

Gunakan endpoint ini hanya untuk simulasi/debug manual.

## Error Umum

Format error standar:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Penjelasan error"
}
```

Beberapa validasi lama hanya mengirim `message` tanpa `code`.

### Error autentikasi perangkat

| HTTP | Code | Arti | Aksi ESP32 |
| --- | --- | --- | --- |
| 401 | `DEVICE_KEY_MISSING` | Header `X-Device-Key` kosong. | Cek firmware/config. |
| 401 | `DEVICE_KEY_INVALID` | Key salah. | Cek `DEVICE_API_KEY`. |
| 401 | `DEVICE_KEY_REVOKED` | Key perangkat dicabut. | Hubungi admin. |
| 401 | `DEVICE_NOT_FOUND` | ID timbangan tidak terdaftar. | Cek `TIMBANGAN_ID` di firmware dan data dashboard. |
| 503 | `DEVICE_KEY_NOT_CONFIGURED` | Server belum punya env key. | Masalah konfigurasi VPS/backend. |

### Error Timbangan 1

| HTTP | Message | Arti | Aksi ESP32 |
| --- | --- | --- | --- |
| 400 | `timbangan_id dan value harus diisi` | Payload kurang. | Pastikan kirim `timbangan_id` dan `value`. |
| 400 | `Value harus berupa angka` | `value` bukan angka. | Kirim number, bukan string kosong. |
| 400 | `Value tidak boleh negatif` | Berat negatif. | Clamp ke 0 di firmware. |
| 404 | `Timbangan dengan ID ... tidak terdaftar` | Timbangan belum ada di database. | Buat/cek timbangan di dashboard. |
| 400 | `Label wajib diisi untuk timbangan tipe MULTI` | Endpoint readings dipakai untuk timbangan multi tanpa label. | Untuk Timbangan 2 pakai batch endpoint. |

### Error Timbangan 2

| HTTP | Code / Message | Arti | Aksi ESP32 |
| --- | --- | --- | --- |
| 400/404 | `BATCH_NOT_ACTIVE` | Belum ada batch racikan aktif. | Tampilkan `AKTIFKAN / RACIKAN DI APK`. |
| 404 | `BATCH_NOT_FOUND` | `batch_id` tidak ditemukan. | Reset batch lokal, ambil target baru. |
| 400 | `BATCH_NOT_MUTABLE` | Batch sudah final/cancel/tidak bisa menerima data. | Reset cache lokal, minta operator ambil target baru. |
| 400 | `BATCH_DATE_MISMATCH` | Tanggal request tidak cocok dengan batch. | Ambil `scale-map` baru. |
| 400 | `DEVICE_TYPE_INVALID` | Timbangan bukan tipe `MULTI`. | Cek konfigurasi timbangan di dashboard. |
| 409 | `REQUEST_ID_CONFLICT` | `request_id` sama tapi payload beda. | Buat `request_id` baru untuk payload baru. |
| 409 | `REQUEST_IN_PROGRESS` | Request sama sedang diproses. | Retry dengan backoff. |
| 400 | `Label bahan wajib dikirim dari timbangan` | Item tanpa `ingredient_id` dan tanpa label. | Kirim `ingredient_id` dari `scale-map`. |
| 400 | `Berat timbang tidak boleh negatif` | Nilai negatif. | Clamp ke 0 sebelum kirim. |
| 400 | `Mode harus SET atau ADD` | Mode salah. | Pakai `SET`. |
| 400 | `Bahan komposisi fase tidak ditemukan di batch aktif` | Item tidak cocok dengan batch. | Ambil `scale-map` baru. |

## Rekomendasi Implementasi Firmware

### Timbangan 1

- Heartbeat tiap `30-60 detik`.
- Kirim reading hanya jika stabil.
- Nilai negatif dijadikan `0`.
- Jangan kirim jika nilai `NaN`, `inf`, atau lonjakan tidak masuk akal.
- Jika request gagal karena jaringan, tunggu lalu retry. Jangan loop terlalu cepat.

### Timbangan 2

- Ambil `scale-map` saat operator menekan tombol ambil target.
- Simpan `batch_id` aktif di ESP32.
- Tahan data sampai satu fase lengkap.
- Kirim satu fase melalui `/scale-readings/bulk`.
- Selalu kirim `request_id`.
- Gunakan `mode: "SET"`.
- Jika error `BATCH_NOT_ACTIVE`, tampilkan:

```text
AKTIFKAN
RACIKAN DI APK
```

- Jika error `BATCH_NOT_FOUND`, `BATCH_NOT_MUTABLE`, atau `BATCH_DATE_MISMATCH`, reset batch lokal dan minta operator ambil target baru.

## Contoh cURL

Heartbeat Timbangan 1:

```bash
curl -i -X POST "https://api-entok.bengkelit.id/api/timbangan/1/heartbeat" \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: entok-2026" \
  -H "X-Device-Id: 1" \
  -d '{"firmware_version":"timbangan1-2026-07-16"}'
```

Kirim reading Timbangan 1:

```bash
curl -i -X POST "https://api-entok.bengkelit.id/api/timbangan/readings" \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: entok-2026" \
  -H "X-Device-Id: 1" \
  -d '{"timbangan_id":1,"value":2.4,"unit":"kg","label":"dedak"}'
```

Ambil target Timbangan 2:

```bash
curl -i "https://api-entok.bengkelit.id/api/feeding-batches/scale-map?timbangan_id=2" \
  -H "X-Device-Key: entok-2026" \
  -H "X-Device-Id: 2"
```

Kirim bulk Timbangan 2:

```bash
curl -i -X POST "https://api-entok.bengkelit.id/api/feeding-batches/scale-readings/bulk" \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: entok-2026" \
  -H "X-Device-Id: 2" \
  -d '{
    "request_id":"2-5-a1b2c3d4",
    "batch_id":"779cf8a9-2a73-4ff1-a84d-139ebb1c25ad",
    "timbangan_id":2,
    "mode":"SET",
    "unit":"kg",
    "items":[
      {"ingredient_id":443,"feed_name":"BSF","phase":"Grower 2 (36-60 Hari)","value":0.18,"planned_amount":0.18},
      {"ingredient_id":444,"feed_name":"dedak","phase":"Grower 2 (36-60 Hari)","value":0.36,"planned_amount":0.36},
      {"ingredient_id":445,"feed_name":"jagung","phase":"Grower 2 (36-60 Hari)","value":0.06,"planned_amount":0.06}
    ]
  }'
```

