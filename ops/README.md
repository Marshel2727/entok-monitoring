# Operasional ENTOK

## Backup harian

Jalankan manual dari VPS:

```bash
chmod +x ops/backup-db.sh ops/restore-db.sh
./ops/backup-db.sh
```

Contoh cron setiap hari pukul 02:15 server:

```cron
15 2 * * * PROJECT_DIR=/home/ubuntu/entok-monitoring-git /home/ubuntu/entok-monitoring-git/ops/backup-db.sh >> /home/ubuntu/entok-backup.log 2>&1
```

Backup disimpan di `backups/`, diverifikasi dengan `gzip -t`, dan dipertahankan 14 hari secara default. Salin backup ke penyimpanan di luar VPS agar tetap tersedia jika VPS rusak.

## Uji restore

Restore sebaiknya diuji lebih dahulu ke environment staging, bukan langsung ke production:

```bash
docker compose -p entok-staging --env-file .env.staging -f docker-compose.staging.yml up -d --build
PROJECT_DIR=/home/ubuntu/entok-monitoring-git ENV_FILE=.env.staging COMPOSE_FILE=docker-compose.staging.yml COMPOSE_PROJECT=entok-staging ./ops/restore-db.sh /path/entok-backup.sql.gz
```

Setelah restore, periksa `/api/system/status`, login, jumlah stok, batch terakhir, dan riwayat transaksi.

## Migrasi API key perangkat

1. Deploy backend dengan `ALLOW_LEGACY_DEVICE_KEY=true`.
2. Login sebagai pengawas dan panggil `POST /api/timbangan/2/credentials/rotate`.
3. Masukkan key yang dikembalikan ke `Timbangan2/config.h`, lalu upload firmware.
4. Pastikan heartbeat Timbangan 2 terlihat pada halaman Kesehatan Sistem.
5. Ubah `ALLOW_LEGACY_DEVICE_KEY=false` dan deploy ulang backend.

Key hanya ditampilkan sekali saat rotasi dan tidak disimpan dalam bentuk teks asli di database.
