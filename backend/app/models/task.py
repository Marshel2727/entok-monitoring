# app/models/task.py
import uuid
from datetime import datetime
from app.utils.db import db

class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(100), nullable=False)
    schedule_time = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text, nullable=False)
    main_image = db.Column(db.String(255), nullable=True)
    info_detail = db.Column(db.Text, nullable=True)
    warning_note = db.Column(db.Text, nullable=True)
    general_note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    steps = db.relationship('TaskStep', backref='task', lazy=True, cascade="all, delete-orphan", order_by="TaskStep.step_no")
    executions = db.relationship('TaskExecution', backref='task', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'nama': self.title,
            'waktu': self.schedule_time,
            'deskripsi': self.description,
            'img': self.main_image,
            'infoDetail': self.info_detail,
            'perhatikan': self.warning_note,
            'catatan': self.general_note,
            'langkah': [step.to_dict() for step in self.steps]
        }

class TaskStep(db.Model):
    __tablename__ = 'task_steps'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    task_id = db.Column(db.String(50), db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    step_no = db.Column(db.Integer, nullable=False)
    instruction = db.Column(db.Text, nullable=False)
    thumbnail_img = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            'no': self.step_no,
            'text': self.instruction,
            'thumbnailImg': self.thumbnail_img
        }

class TaskExecution(db.Model):
    __tablename__ = 'task_executions'

    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = db.Column(db.String(50), db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    keeper_id = db.Column(db.String(50), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    execution_date = db.Column(db.Date, nullable=False)
    is_completed = db.Column(db.Boolean, default=False, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'task_title': self.task.title if self.task else None,
            'keeper_id': self.keeper_id,
            'keeper_name': self.keeper.name if self.keeper else None,
            'execution_date': self.execution_date.isoformat(),
            'is_completed': self.is_completed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
