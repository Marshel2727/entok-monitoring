import uuid
from datetime import datetime
from app.utils.db import db


class FeedingBatch(db.Model):
    __tablename__ = 'feeding_batches'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_date = db.Column(db.Date, nullable=False, index=True)
    task_id = db.Column(db.String(50), db.ForeignKey('tasks.id', ondelete='SET NULL'), nullable=True, index=True)
    keeper_id = db.Column(db.String(50), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    status = db.Column(db.Enum('PREPARING', 'FINALIZED', 'CANCELLED', name='feeding_batch_status'), nullable=False, default='PREPARING')
    tolerance_percent = db.Column(db.Float, nullable=False, default=10.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    finalized_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    ingredients = db.relationship(
        'FeedingBatchIngredient',
        backref='batch',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='FeedingBatchIngredient.feed_name'
    )

    def to_dict(self):
        def phase_rank(phase):
            phase_lower = (phase or '').lower()
            if 'starter' in phase_lower:
                return 0
            if 'grower 1' in phase_lower or 'grower1' in phase_lower:
                return 1
            if 'grower 2' in phase_lower or 'grower2' in phase_lower:
                return 2
            if 'finisher' in phase_lower:
                return 3
            return 4

        ingredients = sorted(
            self.ingredients,
            key=lambda item: (phase_rank(item.phase), item.feed_name.lower())
        )

        return {
            'id': self.id,
            'tanggal': self.batch_date.isoformat() if self.batch_date else None,
            'task_id': self.task_id,
            'keeper_id': self.keeper_id,
            'status': self.status,
            'tolerance_percent': self.tolerance_percent,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'finalized_at': self.finalized_at.isoformat() if self.finalized_at else None,
            'notes': self.notes,
            'ingredients': [ingredient.to_dict() for ingredient in ingredients],
        }


class FeedingBatchIngredient(db.Model):
    __tablename__ = 'feeding_batch_ingredients'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    batch_id = db.Column(db.String(50), db.ForeignKey('feeding_batches.id', ondelete='CASCADE'), nullable=False, index=True)
    feed_id = db.Column(db.String(50), db.ForeignKey('feeds.id', ondelete='SET NULL'), nullable=True)
    phase_id = db.Column(db.String(50), db.ForeignKey('growth_phases.id', ondelete='SET NULL'), nullable=True, index=True)
    feed_name = db.Column(db.String(100), nullable=False)
    phase = db.Column(db.String(100), nullable=False, default='Gabungan')
    population_count = db.Column(db.Integer, nullable=False, default=0)
    target_consumption = db.Column(db.Float, nullable=False, default=0.0)
    planned_amount = db.Column(db.Float, nullable=False, default=0.0)
    weighed_amount = db.Column(db.Float, nullable=False, default=0.0)
    deducted_amount = db.Column(db.Float, nullable=False, default=0.0)
    variance_amount = db.Column(db.Float, nullable=False, default=0.0)
    unit = db.Column(db.String(20), nullable=False, default='kg')

    feed = db.relationship('Feed', lazy='select')
    growth_phase = db.relationship('GrowthPhase', lazy='select')

    def to_dict(self):
        phase_name = self.growth_phase.name if self.growth_phase else self.phase
        return {
            'id': self.id,
            'batch_id': self.batch_id,
            'feed_id': self.feed_id,
            'phase_id': self.phase_id,
            'feed_name': self.feed_name,
            'phase': phase_name,
            'population_count': self.population_count,
            'target_consumption': self.target_consumption,
            'planned_amount': self.planned_amount,
            'weighed_amount': self.weighed_amount,
            'deducted_amount': self.deducted_amount,
            'variance_amount': self.variance_amount,
            'unit': self.unit,
        }
