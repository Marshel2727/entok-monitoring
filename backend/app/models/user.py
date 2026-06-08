# app/models/user.py
import uuid
from datetime import datetime
from app.utils.db import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('PENGAWAS', 'PENJAGA', name='user_roles'), nullable=False)
    shift = db.Column(db.Enum('PAGI', 'SORE', 'FULL_TIME', name='keeper_shifts'), nullable=True)
    status = db.Column(db.Enum('AKTIF', 'NONAKTIF', name='account_status'), nullable=False, default='AKTIF')
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    executions = db.relationship('TaskExecution', backref='keeper', lazy=True, cascade="all, delete-orphan")
    feed_transactions = db.relationship('FeedTransaction', backref='user', lazy=True)
    activity_logs = db.relationship('ActivityLog', backref='user', lazy=True)

    def set_password(self, password_str):
        self.password = generate_password_hash(password_str)

    def check_password(self, password_str):
        return check_password_hash(self.password, password_str)

    def to_dict(self):
        return {
            'id': self.id,
            'nama': self.name,
            'name': self.name,
            'email': self.email,
            'username': self.username,
            'role': self.role,
            'shift': self.shift,
            'status': self.status,
            'tanggal_bergabung': self.joined_at.strftime('%d/%m/%Y') if self.joined_at else None,
            'joined_at': self.joined_at.strftime('%d/%m/%Y') if self.joined_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
