# app/service/task_service.py
from datetime import datetime
from app.utils.db import db
from app.models.task import Task, TaskStep, TaskExecution
from app.models.feeding_batch import FeedingBatch
from app.service.feeding_batch_service import has_finalized_batch, cancel_batch
from app.service.activity_service import create_log
from app.utils.uploads import save_base64_image_if_needed
from app.utils.helpers import format_wita_iso

def _prefer_execution(current, candidate):
    if current is None:
        return candidate
    if candidate.is_completed and not current.is_completed:
        return candidate
    if candidate.completed_at and (not current.completed_at or candidate.completed_at > current.completed_at):
        return candidate
    return current

def get_all_tasks():
    tasks = Task.query.all()
    # Sort tasks chronologically by parse time
    def parse_time(t):
        time_str = t.schedule_time.upper().replace('WITA', '').strip()
        try:
            return datetime.strptime(time_str, "%H:%M").time()
        except ValueError:
            try:
                return datetime.strptime(time_str, "%H.%M").time()
            except ValueError:
                return datetime.min.time()
                
    sorted_tasks = sorted(tasks, key=parse_time)
    return {
        'status': 'success',
        'data': [t.to_dict() for t in sorted_tasks]
    }, 200

def save_task(task_id, data):
    title = data.get('nama', '').strip()
    schedule_time = data.get('waktu', '').strip()
    description = data.get('deskripsi', '').strip()
    try:
        main_image = save_base64_image_if_needed(data.get('img', ''), 'tasks')
    except ValueError as exc:
        return {'status': 'error', 'message': str(exc)}, 400
    info_detail = data.get('infoDetail', '')
    warning_note = data.get('perhatikan', '')
    general_note = data.get('catatan', '')
    steps_data = data.get('langkah', [])  # Array of dict: [{"no": 1, "text": "...", "thumbnailImg": "..."}]

    if not title or not schedule_time or not description:
        return {'status': 'error', 'message': 'Nama tugas, waktu, dan deskripsi wajib diisi'}, 400

    if task_id:
        # Edit mode
        task = Task.query.get(task_id)
        if not task:
            return {'status': 'error', 'message': 'Tugas tidak ditemukan'}, 404

        task.title = title
        task.schedule_time = schedule_time
        task.description = description
        task.main_image = main_image
        task.info_detail = info_detail
        task.warning_note = warning_note
        task.general_note = general_note

        # Re-populate steps
        # Clear old steps
        TaskStep.query.filter_by(task_id=task.id).delete()
        
        # Save new steps
        for step in steps_data:
            try:
                thumbnail_img = save_base64_image_if_needed(step.get('thumbnailImg'), 'tasks')
            except ValueError as exc:
                return {'status': 'error', 'message': str(exc)}, 400

            new_step = TaskStep(
                task_id=task.id,
                step_no=step.get('no'),
                instruction=step.get('text'),
                thumbnail_img=thumbnail_img
            )
            db.session.add(new_step)

        db.session.commit()
        create_log("SISTEM", f"Memperbarui tugas harian penjaga: \"{task.title}\".", data.get('user_id'))
        
        return {
            'status': 'success',
            'message': 'Tugas SOP berhasil diperbarui',
            'data': task.to_dict()
        }, 200
    else:
        # Create mode
        new_task = Task(
            title=title,
            schedule_time=schedule_time,
            description=description,
            main_image=main_image,
            info_detail=info_detail,
            warning_note=warning_note,
            general_note=general_note
        )
        db.session.add(new_task)
        db.session.commit()

        # Save steps
        for step in steps_data:
            try:
                thumbnail_img = save_base64_image_if_needed(step.get('thumbnailImg'), 'tasks')
            except ValueError as exc:
                return {'status': 'error', 'message': str(exc)}, 400

            new_step = TaskStep(
                task_id=new_task.id,
                step_no=step.get('no'),
                instruction=step.get('text'),
                thumbnail_img=thumbnail_img
            )
            db.session.add(new_step)

        db.session.commit()
        create_log("SISTEM", f"Menambahkan tugas harian baru: \"{new_task.title}\".", data.get('user_id'))

        return {
            'status': 'success',
            'message': 'Tugas SOP berhasil ditambahkan',
            'data': new_task.to_dict()
        }, 201

def delete_task(task_id, user_id=None):
    task = Task.query.get(task_id)
    if not task:
        return {'status': 'error', 'message': 'Tugas tidak ditemukan'}, 404

    title = task.title
    db.session.delete(task)
    db.session.commit()
    create_log("SISTEM", f"Menghapus tugas harian penjaga: \"{title}\".", user_id)
    
    return {
        'status': 'success',
        'message': f'Tugas "{title}" berhasil dihapus'
    }, 200

def get_daily_checklist(date_str):
    """
    Retrieves or seeds daily task completion logs for a given date.
    date_str: ISO Date format, e.g. "YYYY-MM-DD"
    """
    try:
        query_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return {'status': 'error', 'message': 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.'}, 400

    tasks = Task.query.all()
    executions = TaskExecution.query.filter_by(execution_date=query_date).all()
    execution_map = {}
    for execution in executions:
        execution_map[execution.task_id] = _prefer_execution(execution_map.get(execution.task_id), execution)

    checklist = []
    seeded = False

    # Get a default active user for seeding keeper_id
    from app.models.user import User
    default_user = User.query.filter_by(status='AKTIF').first()
    if not default_user:
        default_user = User.query.first()
    default_keeper_id = default_user.id if default_user else None

    for task in tasks:
        exec_item = execution_map.get(task.id)
        if not exec_item:
            # Seed execution log if it doesn't exist for this date
            # System defaults keeper to first active user or a placeholder id
            exec_item = TaskExecution(
                task_id=task.id,
                keeper_id=default_keeper_id, # Set to system default placeholder, updated when checked
                execution_date=query_date,
                is_completed=False,
                completed_at=None
            )
            db.session.add(exec_item)
            seeded = True
        
        checklist.append({
            'task_id': task.id,
            'nama': task.title,
            'waktu': task.schedule_time,
            'deskripsi': task.description,
            'img': task.main_image,
            'is_completed': exec_item.is_completed,
            'completed_at': format_wita_iso(exec_item.completed_at),
            'execution_id': exec_item.id,
            'infoDetail': task.info_detail,
            'langkah': [step.to_dict() for step in task.steps],
            'perhatikan': task.warning_note,
            'catatan': task.general_note
        })

    if seeded:
        db.session.commit()

    # Sort checklist chronologically
    def parse_time(t):
        time_str = t['waktu'].upper().replace('WITA', '').strip()
        try:
            return datetime.strptime(time_str, "%H:%M").time()
        except ValueError:
            try:
                return datetime.strptime(time_str, "%H.%M").time()
            except ValueError:
                return datetime.min.time()
                
    checklist = sorted(checklist, key=parse_time)

    return {
        'status': 'success',
        'data': checklist
    }, 200

def toggle_task_execution(task_id, date_str, keeper_id, is_completed):
    """
    Toggles completion status. Beri Pakan can only be completed after the
    daily feeding batch has been finalized, so stock is deducted exactly once.
    """
    try:
        query_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return {'status': 'error', 'message': 'Format tanggal tidak valid'}, 400

    task = Task.query.get(task_id)
    if not task:
        return {'status': 'error', 'message': 'Tugas tidak ditemukan'}, 404

    exec_items = TaskExecution.query.filter_by(task_id=task_id, execution_date=query_date).all()
    if not exec_items:
        exec_item = TaskExecution(
            task_id=task_id,
            keeper_id=keeper_id,
            execution_date=query_date,
            is_completed=False
        )
        db.session.add(exec_item)
        exec_items = [exec_item]
    else:
        exec_item = None
        for item in exec_items:
            exec_item = _prefer_execution(exec_item, item)

    # If it is being marked completed
    was_completed = any(item.is_completed for item in exec_items)
    if is_completed and not was_completed:
        if "beri pakan" in task.title.lower():
            if not any(has_finalized_batch(date_str, task_id, item.id) for item in exec_items):
                return {
                    'status': 'error',
                    'message': 'Finalisasi racikan pakan terlebih dahulu sebelum menyelesaikan tugas Beri Pakan.'
                }, 400

            create_log("SISTEM", "[OPERASIONAL] Penjaga menyelesaikan tugas Beri Pakan berdasarkan batch racikan final.", keeper_id)
        else:
            create_log("SISTEM", f"[OPERASIONAL] Penjaga menyelesaikan tugas {task.title}.", keeper_id)

        completed_at = datetime.utcnow()
        for item in exec_items:
            item.is_completed = True
            item.keeper_id = keeper_id
            item.completed_at = completed_at
        
    # If it is being marked uncompleted
    elif not is_completed and was_completed:
        create_log("SISTEM", f"[OPERASIONAL] Penjaga membatalkan status tugas {task.title}.", keeper_id)
        for item in exec_items:
            item.is_completed = False
            item.completed_at = None
            item.keeper_id = keeper_id

    exec_item = None
    for item in exec_items:
        exec_item = _prefer_execution(exec_item, item)

    db.session.commit()
    
    return {
        'status': 'success',
        'message': 'Status tugas berhasil diperbarui',
        'data': {
            'task_id': task.id,
            'is_completed': exec_item.is_completed,
            'completed_at': format_wita_iso(exec_item.completed_at)
        }
    }, 200


def reset_daily_checklist(date_str, keeper_id):
    try:
        query_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return {'status': 'error', 'message': 'Format tanggal tidak valid'}, 400

    executions = TaskExecution.query.filter_by(execution_date=query_date).all()
    reset_count = 0
    for exec_item in executions:
        if exec_item.is_completed or exec_item.completed_at:
            reset_count += 1
        exec_item.is_completed = False
        exec_item.completed_at = None
        exec_item.keeper_id = keeper_id

    batches = FeedingBatch.query.filter(
        FeedingBatch.batch_date == query_date,
        FeedingBatch.status.in_(('PREPARING', 'READY_TO_FINALIZE', 'FINALIZED'))
    ).all()

    for batch in batches:
        res, code = cancel_batch(batch.id, keeper_id)
        if code >= 400:
            db.session.rollback()
            return res, code

    db.session.commit()
    create_log("SISTEM", f"[OPERASIONAL] Reset checklist harian {query_date.isoformat()} ({reset_count} tugas).", keeper_id)

    return {
        'status': 'success',
        'message': 'Checklist harian dan batch racikan berhasil direset',
        'data': {
            'date': query_date.isoformat(),
            'reset_tasks': reset_count,
            'cancelled_batches': len(batches)
        }
    }, 200
