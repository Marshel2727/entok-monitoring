# app/models/formulation.py
import uuid
from datetime import datetime
from app.utils.db import db

class Formulation(db.Model):
    __tablename__ = 'formulations'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    phase_id = db.Column(db.String(50), db.ForeignKey('growth_phases.id', ondelete='SET NULL'), nullable=True, index=True)
    phase = db.Column(db.String(100), unique=True, nullable=False, index=True)
    target_consumption = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    composition = db.Column(db.JSON, nullable=False)  # Composition map: {"Dedak": 40, "Jagung": 20}
    alternative_feeds = db.Column(db.JSON, nullable=False)  # List of strings: ["Azolla", "Daun Pepaya"]
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    growth_phase = db.relationship('GrowthPhase', lazy='select')

    def to_dict(self):
        phase_name = self.growth_phase.name if self.growth_phase else self.phase
        return {
            'id': self.id,
            'phase_id': self.phase_id,
            'fase': phase_name,
            'targetKonsumsi': self.target_consumption,
            'kategori': self.category,
            'komposisi': self.composition,
            'pakanAlternatif': self.alternative_feeds
        }
