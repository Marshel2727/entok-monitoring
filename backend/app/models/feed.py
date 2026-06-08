# app/models/feed.py
import uuid
from datetime import datetime
from app.utils.db import db

class Feed(db.Model):
    __tablename__ = 'feeds'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False)
    stock = db.Column(db.Float, default=0.0, nullable=False)
    min_threshold = db.Column(db.Float, default=5.0, nullable=False)
    protein = db.Column(db.Float, default=0.0, nullable=False)
    carbohydrate = db.Column(db.Float, default=0.0, nullable=False)
    fat = db.Column(db.Float, default=0.0, nullable=False)
    fiber = db.Column(db.Float, default=0.0, nullable=False)
    mineral = db.Column(db.Float, default=0.0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    transactions = db.relationship('FeedTransaction', backref='feed', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'nama': self.name,
            'kategori': self.category,
            'stok': self.stock,
            'ambangBatas': self.min_threshold,
            'nutrisi': {
                'protein': self.protein,
                'karbohidrat': self.carbohydrate,
                'lemak': self.fat,
                'serat': self.fiber,
                'mineral': self.mineral
            }
        }

class FeedTransaction(db.Model):
    __tablename__ = 'feed_transactions'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    feed_id = db.Column(db.String(50), db.ForeignKey('feeds.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.Enum('IN', 'OUT', name='transaction_types'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'feed_id': self.feed_id,
            'feed_name': self.feed.name if self.feed else None,
            'type': self.type,
            'amount': self.amount,
            'description': self.description,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'created_at': self.created_at.isoformat()
        }
