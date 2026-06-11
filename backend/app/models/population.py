# app/models/population.py
import uuid
from datetime import datetime
from app.utils.db import db
from app.utils.helpers import format_wita_datetime

class Population(db.Model):
    __tablename__ = 'populations'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    phase_id = db.Column(db.String(50), db.ForeignKey('growth_phases.id', ondelete='SET NULL'), nullable=True, unique=True, index=True)
    phase = db.Column(db.String(100), unique=True, nullable=False, index=True)
    total_ducks = db.Column(db.Integer, default=0, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    growth_phase = db.relationship('GrowthPhase', lazy='select')

    def to_dict(self):
        phase_name = self.growth_phase.name if self.growth_phase else self.phase
        return {
            'id': self.id,
            'phase_id': self.phase_id,
            'fase': phase_name,
            'jumlah_ekor': self.total_ducks,
            'updated_at': self.updated_at.isoformat()
        }

class PopulationLog(db.Model):
    __tablename__ = 'population_logs'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    phase_id = db.Column(db.String(50), db.ForeignKey('growth_phases.id', ondelete='SET NULL'), nullable=True, index=True)
    phase = db.Column(db.String(100), nullable=False)
    old_value = db.Column(db.Integer, nullable=False)
    new_value = db.Column(db.Integer, nullable=False)
    difference = db.Column(db.String(20), nullable=False)
    logged_at = db.Column(db.DateTime, default=datetime.utcnow)

    growth_phase = db.relationship('GrowthPhase', lazy='select')

    def to_dict(self):
        phase_name = self.growth_phase.name if self.growth_phase else self.phase
        return {
            'id': self.id,
            'phase_id': self.phase_id,
            'kategori': phase_name,
            'nilaiLama': self.old_value,
            'nilaiBaru': self.new_value,
            'selisih': self.difference,
            'waktu': format_wita_datetime(self.logged_at)
        }
