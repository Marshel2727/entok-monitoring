# app/models/population.py
import uuid
from datetime import datetime
from app.utils.db import db
from app.utils.helpers import format_wita_datetime

class Population(db.Model):
    __tablename__ = 'populations'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    phase = db.Column(db.String(100), unique=True, nullable=False, index=True)
    total_ducks = db.Column(db.Integer, default=0, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'fase': self.phase,
            'jumlah_ekor': self.total_ducks,
            'updated_at': self.updated_at.isoformat()
        }

class PopulationLog(db.Model):
    __tablename__ = 'population_logs'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    phase = db.Column(db.String(100), nullable=False)
    old_value = db.Column(db.Integer, nullable=False)
    new_value = db.Column(db.Integer, nullable=False)
    difference = db.Column(db.String(20), nullable=False)
    logged_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'kategori': self.phase,
            'nilaiLama': self.old_value,
            'nilaiBaru': self.new_value,
            'selisih': self.difference,
            'waktu': format_wita_datetime(self.logged_at)
        }
