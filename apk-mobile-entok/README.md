# Penjaga Entok Mobile

Aplikasi Flutter untuk portal penjaga Entok Premium. Aplikasi ini sudah terhubung ke backend production:

```text
https://api-entok.bengkelit.id/api
```

## Cara Menjalankan

Pastikan Flutter SDK sudah terpasang dan bisa dicek dengan:

```bash
flutter --version
```

Lalu jalankan:

```bash
cd "C:\PROJECT WEB\ENTOK\apk-mobile-entok"
flutter create .
flutter pub get
flutter run
```

Untuk build APK:

```bash
flutter build apk
```

## Build APK Dengan Docker

Kalau belum ingin install Flutter lokal, APK bisa dibuild lewat Docker dari root repo:

```bash
cd "C:\PROJECT WEB\ENTOK"
docker compose --profile apk build apk-mobile
docker compose --profile apk run --rm apk-mobile
```

Perintah itu akan membuat folder Android jika belum ada, mengambil dependency Flutter, lalu build APK debug.
Hasil APK ada di:

```text
C:\PROJECT WEB\ENTOK\apk-mobile-entok\build-output\penjaga-entok-debug.apk
```

Kalau ingin mengambil APK dari folder build Flutter asli, file debug juga ada di dalam container path:

```text
build/app/outputs/flutter-apk/app-debug.apk
```

## Catatan

- Login memakai akun penjaga/pengawas dari database backend.
- API berada di `lib/services/api_service.dart`.
- Aplikasi menjadwalkan notifikasi lokal sebelum waktu tugas harian. Waktu pengingat bisa dipilih 1 menit, 30 menit, 1 jam, keduanya, atau custom 1-1440 menit.
- Halaman pengaturan notifikasi punya tombol tes untuk memastikan izin notifikasi Android aktif.
- Jangan simpan password database atau secret backend di aplikasi mobile.
- Docker dipakai hanya untuk build APK, bukan untuk menjalankan aplikasi langsung di HP.
