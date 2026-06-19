# Penjaga Entok Mobile

Aplikasi Flutter untuk portal penjaga Entok Premium. Aplikasi ini sudah terhubung ke backend production:

```text
https://api-entok.marshelportfolio.me/api
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
docker compose -f docker-compose.mobile.yml run --rm mobile-apk
```

Perintah itu akan membuat folder Android jika belum ada, mengambil dependency Flutter, lalu build APK debug.
Hasil APK ada di:

```text
C:\PROJECT WEB\ENTOK\apk-mobile-entok\build\app\outputs\flutter-apk\app-debug.apk
```

Untuk build release:

```bash
docker compose -f docker-compose.mobile.yml run --rm mobile-apk sh -lc "flutter pub get && flutter build apk --release"
```

Hasil release ada di:

```text
C:\PROJECT WEB\ENTOK\apk-mobile-entok\build\app\outputs\flutter-apk\app-release.apk
```

## Catatan

- Login memakai akun penjaga/pengawas dari database backend.
- API berada di `lib/services/api_service.dart`.
- Jangan simpan password database atau secret backend di aplikasi mobile.
- Docker dipakai hanya untuk build APK, bukan untuk menjalankan aplikasi langsung di HP.
