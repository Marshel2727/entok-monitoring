# Struktur Project Entok Monitoring

Dokumen ini menjelaskan tempat yang tepat untuk menaruh file agar project tidak membingungkan ketika dikembangkan lagi.

## Frontend

```text
frontend/src/
  app/          Route Next.js. File di sini hanya menyusun halaman dan mengambil data awal.
  components/   UI dan tampilan layar. Hindari menaruh aturan bisnis berat di sini.
  context/      State global React seperti auth, tema, dan data aplikasi lintas halaman.
  domain/       Aturan bisnis frontend: kalkulasi, pemilihan data, view-model, dan validasi logic UI.
  hooks/        Custom React hooks.
  services/     Client API ke backend. Isinya request HTTP, bukan rumus bisnis.
  types/        TypeScript types yang dipakai lintas modul.
  utils/        Helper umum yang tidak spesifik domain, misalnya format angka/tanggal.
```

### Domain Frontend

```text
frontend/src/domain/
  feeding/
    feedingBatchView.ts      Logic pemilihan dan pengelompokan batch racikan pakan.
  nutrition/
    nutritionAnalysis.ts     Logic analisis nutrisi harian/mingguan/bulanan dari transaksi pakan.
```

Gunakan pola ini untuk fitur baru:

```text
components -> render UI
services   -> panggil API
domain     -> hitung/putuskan data bisnis
types      -> kontrak data
```

Contoh:

- Tombol dan tabel batch ada di `components`.
- Request batch ke backend ada di `services`.
- Pilih batch terbaik, hitung total timbang, dan status final ada di `domain/feeding`.

## Backend

```text
backend/app/
  models/    Definisi tabel SQLAlchemy dan relasi database.
  routes/    HTTP endpoint, auth, parsing request, dan response.
  schemas/   Marshmallow schema untuk validasi payload masuk.
  service/   Proses bisnis dan operasi database yang lebih panjang.
  utils/     Helper umum backend seperti waktu, response, dan file upload.
```

### Alur Backend Yang Disarankan

```text
request -> routes -> schemas -> service -> models -> database
```

Aturan praktis:

- `routes` jangan berisi logic bisnis panjang.
- `schemas` wajib dipakai untuk payload dari frontend atau ESP32.
- `service` menjadi tempat transaksi penting seperti finalisasi batch dan pemotongan stok.
- `models` hanya mewakili tabel dan relasi database.

## Prinsip Penting

- Jangan duplikasi logic yang sama di desktop dan mobile. Buat helper di `domain`, lalu dipakai bersama.
- Jangan campur API call dengan perhitungan data. API call tetap di `services`.
- Jangan taruh rumus bisnis di page Next.js kalau rumusnya akan dipakai ulang.
- Database tetap menjadi sumber data utama; frontend hanya menghitung tampilan dari data tersebut.
