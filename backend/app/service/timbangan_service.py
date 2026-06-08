# app/service/timbangan_service.py
from app.utils.db import db
from app.models.timbangan import Timbangan, TimbanganReading
from app.models.feed import Feed, FeedTransaction
from app.service.activity_service import create_log


# ==========================================
#  TIMBANGAN (Scale Registry) - CRUD
# ==========================================

def get_all_timbangan():
    """Ambil daftar semua timbangan beserta reading terakhir."""
    items = Timbangan.query.order_by(Timbangan.id.asc()).all()
    return {
        'status': 'success',
        'data': [item.to_dict() for item in items]
    }, 200


def get_timbangan_by_id(timbangan_id):
    """Ambil detail satu timbangan."""
    item = Timbangan.query.get(timbangan_id)
    if not item:
        return {'status': 'error', 'message': 'Timbangan tidak ditemukan'}, 404
    return {
        'status': 'success',
        'data': item.to_dict()
    }, 200


def save_timbangan(timbangan_id, data):
    """Tambah atau edit timbangan."""
    nama = data.get('nama', '').strip()
    deskripsi = data.get('deskripsi', '').strip()
    tipe = data.get('tipe', 'DEDICATED').strip().upper()
    default_label = data.get('default_label', '').strip() or None

    if not nama:
        return {'status': 'error', 'message': 'Nama timbangan harus diisi'}, 400

    if tipe not in ('DEDICATED', 'MULTI'):
        return {'status': 'error', 'message': 'Tipe harus DEDICATED atau MULTI'}, 400

    if timbangan_id:
        # Edit mode
        item = Timbangan.query.get(timbangan_id)
        if not item:
            return {'status': 'error', 'message': 'Timbangan tidak ditemukan'}, 404

        # Cek duplikat nama
        existing = Timbangan.query.filter(Timbangan.nama == nama, Timbangan.id != timbangan_id).first()
        if existing:
            return {'status': 'error', 'message': f'Timbangan dengan nama "{nama}" sudah ada'}, 409

        item.nama = nama
        item.deskripsi = deskripsi
        item.tipe = tipe
        item.default_label = default_label

        db.session.commit()
        create_log("SISTEM", f"Memperbarui timbangan: \"{nama}\".", data.get('user_id'))

        return {
            'status': 'success',
            'message': 'Timbangan berhasil diperbarui',
            'data': item.to_dict()
        }, 200
    else:
        # Create mode
        existing = Timbangan.query.filter(Timbangan.nama == nama).first()
        if existing:
            return {'status': 'error', 'message': f'Timbangan dengan nama "{nama}" sudah ada'}, 409

        new_item = Timbangan(
            nama=nama,
            deskripsi=deskripsi,
            tipe=tipe,
            default_label=default_label
        )
        db.session.add(new_item)
        db.session.commit()

        create_log("SISTEM", f"Mendaftarkan timbangan baru: \"{nama}\".", data.get('user_id'))

        return {
            'status': 'success',
            'message': 'Timbangan berhasil didaftarkan',
            'data': new_item.to_dict()
        }, 201


def delete_timbangan(timbangan_id, user_id=None):
    """Hapus timbangan beserta semua reading-nya (cascade)."""
    item = Timbangan.query.get(timbangan_id)
    if not item:
        return {'status': 'error', 'message': 'Timbangan tidak ditemukan'}, 404

    nama = item.nama
    db.session.delete(item)
    db.session.commit()
    create_log("SISTEM", f"Menghapus timbangan: \"{nama}\" beserta seluruh riwayat data.", user_id)

    return {
        'status': 'success',
        'message': f'Timbangan "{nama}" berhasil dihapus'
    }, 200


def update_timbangan_status(timbangan_id, new_status):
    """Update status online/offline timbangan (dipanggil dari ESP32 heartbeat)."""
    item = Timbangan.query.get(timbangan_id)
    if not item:
        return {'status': 'error', 'message': 'Timbangan tidak ditemukan'}, 404

    if new_status not in ('ONLINE', 'OFFLINE'):
        return {'status': 'error', 'message': 'Status harus ONLINE atau OFFLINE'}, 400

    item.status = new_status
    db.session.commit()

    return {
        'status': 'success',
        'message': f'Status timbangan "{item.nama}" diperbarui ke {new_status}',
        'data': item.to_dict()
    }, 200


# ==========================================
#  TIMBANGAN READINGS - Data Sensor
# ==========================================

def add_reading(data):
    """
    Tambah data pembacaan sensor dari ESP32.
    ESP32 mengirim: { timbangan_id, value, label? }
    - Untuk DEDICATED: label otomatis dari default_label timbangan
    - Untuk MULTI: label wajib dikirim dari ESP32
    """
    timbangan_id = data.get('timbangan_id')
    value = data.get('value')
    label = data.get('label', '').strip()
    unit = data.get('unit', 'kg').strip()

    if timbangan_id is None or value is None:
        return {'status': 'error', 'message': 'timbangan_id dan value harus diisi'}, 400

    try:
        value = float(value)
    except (ValueError, TypeError):
        return {'status': 'error', 'message': 'Value harus berupa angka'}, 400

    if value < 0:
        return {'status': 'error', 'message': 'Value tidak boleh negatif'}, 400

    # Cek timbangan terdaftar
    timbangan = Timbangan.query.get(timbangan_id)
    if not timbangan:
        return {'status': 'error', 'message': f'Timbangan dengan ID {timbangan_id} tidak terdaftar'}, 404

    # Tentukan label
    if timbangan.tipe == 'DEDICATED':
        # Untuk DEDICATED, gunakan default_label jika label tidak dikirim
        label = label or timbangan.default_label or timbangan.nama
    elif timbangan.tipe == 'MULTI':
        # Untuk MULTI, label wajib
        if not label:
            return {'status': 'error', 'message': 'Label wajib diisi untuk timbangan tipe MULTI'}, 400

    # Coba link ke feed_id berdasarkan label (opsional)
    feed = Feed.query.filter(Feed.name.ilike(label)).first()
    feed_id = feed.id if feed else None

    # Simpan reading
    reading = TimbanganReading(
        timbangan_id=timbangan_id,
        value=value,
        unit=unit,
        label=label,
        feed_id=feed_id
    )
    db.session.add(reading)

    # Update status timbangan ke ONLINE (ada data masuk = aktif)
    timbangan.status = 'ONLINE'

    # Hanya timbangan stok dedicated yang boleh mengoreksi stok fisik.
    # Timbangan MULTI dipakai untuk menimbang racikan, bukan memotong stok
    # langsung, agar tidak dobel dengan transaksi dari checklist Beri Pakan.
    if feed and timbangan.tipe == 'DEDICATED':
        old_stock = float(feed.stock or 0)
        difference = round(value - old_stock, 2)

        if abs(difference) >= 0.01:
            tx = FeedTransaction(
                feed_id=feed.id,
                type='IN' if difference > 0 else 'OUT',
                amount=abs(difference),
                description=f'Penyesuaian stok aktual dari {timbangan.nama}',
                user_id=None
            )
            db.session.add(tx)

            feed.stock = value  # Stok aktual mengikuti pembacaan timbangan
            create_log(
                "INVENTARIS",
                f"Penyesuaian stok \"{feed.name}\" dari timbangan: {old_stock:.1f} kg -> {value:.1f} kg (selisih {difference:+.1f} kg).",
                None
            )
        else:
            feed.stock = value

    db.session.commit()

    return {
        'status': 'success',
        'message': 'Data pembacaan berhasil disimpan',
        'data': reading.to_dict()
    }, 201


def get_readings(timbangan_id=None, label=None, limit=100):
    """
    Ambil data pembacaan sensor.
    Filter opsional berdasarkan timbangan_id dan/atau label.
    """
    query = TimbanganReading.query

    if timbangan_id:
        query = query.filter(TimbanganReading.timbangan_id == timbangan_id)

    if label:
        query = query.filter(TimbanganReading.label.ilike(f'%{label}%'))

    readings = query.order_by(TimbanganReading.recorded_at.desc()).limit(limit).all()

    return {
        'status': 'success',
        'data': [r.to_dict() for r in readings],
        'count': len(readings)
    }, 200


def get_latest_readings(timbangan_id=None):
    """
    Ambil pembacaan terakhir per label untuk setiap timbangan.
    Berguna untuk dashboard real-time.
    """
    if timbangan_id:
        timbangan_list = Timbangan.query.filter_by(id=timbangan_id).all()
    else:
        timbangan_list = Timbangan.query.order_by(Timbangan.id.asc()).all()

    result = []
    for t in timbangan_list:
        # Ambil semua label unik untuk timbangan ini
        labels = db.session.query(TimbanganReading.label).filter(
            TimbanganReading.timbangan_id == t.id
        ).distinct().all()

        label_data = []
        for (lbl,) in labels:
            latest = TimbanganReading.query.filter(
                TimbanganReading.timbangan_id == t.id,
                TimbanganReading.label == lbl
            ).order_by(TimbanganReading.recorded_at.desc()).first()

            if latest:
                label_data.append(latest.to_dict())

        result.append({
            'timbangan': t.to_dict(),
            'latest_per_label': label_data
        })

    return {
        'status': 'success',
        'data': result
    }, 200


def get_reading_summary(timbangan_id, period='day'):
    """
    Ambil ringkasan data pembacaan untuk grafik.
    period: 'day' | 'week' | 'month'
    """
    from datetime import timedelta

    timbangan = Timbangan.query.get(timbangan_id)
    if not timbangan:
        return {'status': 'error', 'message': 'Timbangan tidak ditemukan'}, 404

    from datetime import datetime
    now = datetime.utcnow()

    if period == 'day':
        since = now - timedelta(days=1)
    elif period == 'week':
        since = now - timedelta(weeks=1)
    elif period == 'month':
        since = now - timedelta(days=30)
    else:
        since = now - timedelta(days=1)

    readings = TimbanganReading.query.filter(
        TimbanganReading.timbangan_id == timbangan_id,
        TimbanganReading.recorded_at >= since
    ).order_by(TimbanganReading.recorded_at.asc()).all()

    # Kelompokkan per label
    grouped = {}
    for r in readings:
        if r.label not in grouped:
            grouped[r.label] = []
        grouped[r.label].append(r.to_dict())

    return {
        'status': 'success',
        'timbangan': timbangan.to_dict(),
        'period': period,
        'data': grouped
    }, 200


def delete_reading(reading_id, user_id=None):
    """Hapus satu reading tertentu."""
    reading = TimbanganReading.query.get(reading_id)
    if not reading:
        return {'status': 'error', 'message': 'Data reading tidak ditemukan'}, 404

    db.session.delete(reading)
    db.session.commit()

    return {
        'status': 'success',
        'message': 'Data reading berhasil dihapus'
    }, 200


def seed_default_timbangan():
    """
    Buat 3 timbangan default jika belum ada.
    Dipanggil saat pertama kali aplikasi dijalankan.
    """
    if Timbangan.query.count() > 0:
        return  # Sudah ada data

    defaults = [
        Timbangan(
            id=1,
            nama='Timbangan 1',
            deskripsi='Monitor stok Dedak secara otomatis (sensor IoT)',
            tipe='DEDICATED',
            default_label='Dedak',
            status='OFFLINE'
        ),
        Timbangan(
            id=2,
            nama='Timbangan 2',
            deskripsi='Timbangan manual untuk menimbang berbagai jenis pakan',
            tipe='MULTI',
            default_label=None,
            status='OFFLINE'
        ),
        Timbangan(
            id=3,
            nama='Timbangan 3',
            deskripsi='Monitor berat badan entok (sensor IoT)',
            tipe='DEDICATED',
            default_label='Entok',
            status='OFFLINE'
        ),
    ]

    db.session.add_all(defaults)
    db.session.commit()
