# app/models/activity_log.py
import uuid
from datetime import datetime
from app.utils.db import db
from app.utils.helpers import format_wita_datetime

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    type = db.Column(db.Enum('RESTOCK', 'FORMULASI', 'INVENTARIS', 'SISTEM', name='log_types'), nullable=False)
    description = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    logged_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'waktu': format_wita_datetime(self.logged_at),
            'tipe': self.type,
            'deskripsi': self.description,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None
        }
