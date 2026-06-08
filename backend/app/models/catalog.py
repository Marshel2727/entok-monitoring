# app/models/catalog.py
import uuid
from datetime import datetime
from app.utils.db import db

class Catalog(db.Model):
    __tablename__ = 'catalogs'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Integer, nullable=False)
    stock = db.Column(db.Integer, default=0, nullable=False)
    unit = db.Column(db.String(20), default='Ekor', nullable=False)
    tag = db.Column(db.Enum('TANGGUH', 'READY', 'LIMITED', 'NEW', name='catalog_tags'), default='NEW', nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'nama': self.name,
            'deskripsi': self.description,
            'harga': self.price,
            'stok': self.stock,
            'satuan': self.unit,
            'tag': self.tag,
            'img': self.image_url
        }
