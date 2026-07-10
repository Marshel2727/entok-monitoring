# app/models/timbangan.py
import os
import uuid
from datetime import datetime
from app.utils.db import db
from app.utils.helpers import format_wita_iso


class Timbangan(db.Model):
    """
    Registry timbangan (alat penimbang IoT).
    - DEDICATED: Timbangan 1 (stok Dedak) & Timbangan 3 (berat entok) — 1 jenis data
    - MULTI: Timbangan 2 (berbagai jenis pakan) — banyak jenis data
    """
    __tablename__ = 'timbangan'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nama = db.Column(db.String(100), nullable=False, unique=True)
    deskripsi = db.Column(db.Text, nullable=True)
    tipe = db.Column(db.Enum('DEDICATED', 'MULTI', name='timbangan_tipe'), nullable=False, default='DEDICATED')
    status = db.Column(db.Enum('ONLINE', 'OFFLINE', name='timbangan_status'), nullable=False, default='OFFLINE')
    default_label = db.Column(db.String(100), nullable=True)  # Label tetap untuk tipe DEDICATED (e.g. "Dedak", "Entok")
    last_seen_at = db.Column(db.DateTime, nullable=True, index=True)
    firmware_version = db.Column(db.String(50), nullable=True)
    last_ip = db.Column(db.String(45), nullable=True)
    device_key_hash = db.Column(db.String(64), nullable=True)
    device_key_prefix = db.Column(db.String(16), nullable=True)
    device_key_revoked_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    readings = db.relationship('TimbanganReading', backref='timbangan', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        # Ambil reading terakhir untuk info status
        last_reading = self.readings.order_by(TimbanganReading.recorded_at.desc()).first()
        offline_seconds = int(os.getenv('DEVICE_OFFLINE_SECONDS', '90'))
        is_recent = bool(
            self.last_seen_at
            and (datetime.utcnow() - self.last_seen_at).total_seconds() <= offline_seconds
        )
        effective_status = 'ONLINE' if self.status == 'ONLINE' and is_recent else 'OFFLINE'
        return {
            'id': self.id,
            'nama': self.nama,
            'deskripsi': self.deskripsi,
            'tipe': self.tipe,
            'status': effective_status,
            'default_label': self.default_label,
            'last_seen_at': format_wita_iso(self.last_seen_at),
            'firmware_version': self.firmware_version,
            'last_ip': self.last_ip,
            'credential_configured': bool(self.device_key_hash),
            'device_key_prefix': self.device_key_prefix,
            'device_key_revoked': self.device_key_revoked_at is not None,
            'last_reading': last_reading.to_dict() if last_reading else None,
            'created_at': format_wita_iso(self.created_at),
            'updated_at': format_wita_iso(self.updated_at)
        }


class TimbanganReading(db.Model):
    """
    Data pembacaan sensor dari semua timbangan.
    - Timbangan 1 (DEDICATED): label selalu 'Dedak', feed_id terhubung ke tabel feeds
    - Timbangan 2 (MULTI): label bisa 'Dedak', 'Jagung', 'Konsentrat', dll
    - Timbangan 3 (DEDICATED): label selalu 'Entok', feed_id = NULL
    """
    __tablename__ = 'timbangan_readings'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    timbangan_id = db.Column(db.Integer, db.ForeignKey('timbangan.id', ondelete='CASCADE'), nullable=False, index=True)
    value = db.Column(db.Float, nullable=False)  # Nilai pembacaan (kg)
    unit = db.Column(db.String(20), nullable=False, default='kg')
    label = db.Column(db.String(100), nullable=False, index=True)  # Nama item yang ditimbang
    feed_id = db.Column(db.String(50), db.ForeignKey('feeds.id', ondelete='SET NULL'), nullable=True)  # Link ke tabel feeds (opsional)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationship ke Feed (opsional)
    feed = db.relationship('Feed', backref='scale_readings', lazy='select')

    def to_dict(self):
        return {
            'id': self.id,
            'timbangan_id': self.timbangan_id,
            'value': self.value,
            'unit': self.unit,
            'label': self.label,
            'feed_id': self.feed_id,
            'recorded_at': format_wita_iso(self.recorded_at)
        }


class TimbanganRequest(db.Model):
    """Idempotency record for requests sent by an IoT scale."""
    __tablename__ = 'timbangan_requests'
    __table_args__ = (
        db.UniqueConstraint('timbangan_id', 'endpoint', 'request_id', name='uq_timbangan_request'),
    )

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    timbangan_id = db.Column(db.Integer, db.ForeignKey('timbangan.id', ondelete='CASCADE'), nullable=False, index=True)
    endpoint = db.Column(db.String(50), nullable=False)
    request_id = db.Column(db.String(100), nullable=False)
    payload_hash = db.Column(db.String(64), nullable=False)
    batch_id = db.Column(db.String(50), db.ForeignKey('feeding_batches.id', ondelete='SET NULL'), nullable=True, index=True)
    response_code = db.Column(db.Integer, nullable=True)
    response_payload = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
