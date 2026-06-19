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

## Catatan

- Login memakai akun penjaga/pengawas dari database backend.
- API berada di `lib/services/api_service.dart`.
- Jangan simpan password database atau secret backend di aplikasi mobile.
