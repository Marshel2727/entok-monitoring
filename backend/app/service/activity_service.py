# app/service/activity_service.py
from app.utils.db import db
from app.models.activity_log import ActivityLog

def get_all_logs():
    logs = ActivityLog.query.order_by(ActivityLog.logged_at.desc()).all()
    return {
        'status': 'success',
        'data': [log.to_dict() for log in logs]
    }, 200

def create_log(log_type, description, user_id=None):
    """
    Creates a new audit activity log. 
    Accepts log_type: 'RESTOCK' | 'FORMULASI' | 'INVENTARIS' | 'SISTEM'
    """
    # Verify valid user_id (if placeholder 'system' or system default is passed, set as null or handle)
    actual_user_id = None
    if user_id and user_id != 'system' and len(user_id) > 10:
        actual_user_id = user_id

    # Create log
    # Using local WITA time for database insertion (optional, default is UTC but we can match UI timestamp representation)
    log = ActivityLog(
        type=log_type,
        description=description,
        user_id=actual_user_id
    )
    db.session.add(log)
    db.session.commit()
    return log

def clear_logs(user_id=None):
    """Clears all audit logs and records a new system log initialization."""
    ActivityLog.query.delete()
    db.session.commit()
    
    # Insert new initialization log
    init_log = create_log("SISTEM", "Riwayat log dibersihkan oleh pengguna.", user_id)
    
    return {
        'status': 'success',
        'message': 'Riwayat log berhasil dibersihkan',
        'data': [init_log.to_dict()]
    }, 200
