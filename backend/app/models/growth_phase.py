import uuid
from datetime import datetime
from app.utils.db import db


DEFAULT_GROWTH_PHASES = (
    {
        'name': 'Starter (1-14 Hari)',
        'phase_key': 'starter',
        'min_age_days': 1,
        'max_age_days': 14,
        'sort_order': 10,
    },
    {
        'name': 'Grower 1 (15-35 Hari)',
        'phase_key': 'grower 1',
        'min_age_days': 15,
        'max_age_days': 35,
        'sort_order': 20,
    },
    {
        'name': 'Grower 2 (36-60 Hari)',
        'phase_key': 'grower 2',
        'min_age_days': 36,
        'max_age_days': 60,
        'sort_order': 30,
    },
    {
        'name': 'Finisher (>60 Hari)',
        'phase_key': 'finisher',
        'min_age_days': 61,
        'max_age_days': None,
        'sort_order': 40,
    },
)


def normalize_phase_key(phase):
    phase_lower = (phase or '').strip().lower()
    if 'starter' in phase_lower:
        return 'starter'
    if 'grower 1' in phase_lower or 'grower1' in phase_lower:
        return 'grower 1'
    if 'grower 2' in phase_lower or 'grower2' in phase_lower:
        return 'grower 2'
    if 'finisher' in phase_lower:
        return 'finisher'
    return phase_lower


class GrowthPhase(db.Model):
    __tablename__ = 'growth_phases'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), unique=True, nullable=False)
    phase_key = db.Column(db.String(50), unique=True, nullable=False, index=True)
    min_age_days = db.Column(db.Integer, nullable=True)
    max_age_days = db.Column(db.Integer, nullable=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phase': self.name,
            'phase_key': self.phase_key,
            'min_age_days': self.min_age_days,
            'max_age_days': self.max_age_days,
            'sort_order': self.sort_order,
        }
