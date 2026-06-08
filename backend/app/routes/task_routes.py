# app/routes/task_routes.py
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.service import task_service

task_bp = Blueprint('task_bp', __name__)

@task_bp.route('', methods=['GET'])
def get_tasks():
    res, code = task_service.get_all_tasks()
    return jsonify(res), code

@task_bp.route('', methods=['POST'])
@token_required
@roles_allowed('PENGAWAS')
def save_task(current_user):
    data = request.get_json() or {}
    data['user_id'] = current_user.id
    
    # Check if id is passed in body for edit mode
    task_id = data.get('id')
    
    res, code = task_service.save_task(task_id, data)
    return jsonify(res), code

@task_bp.route('/<task_id>', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def delete_task(current_user, task_id):
    res, code = task_service.delete_task(task_id, current_user.id)
    return jsonify(res), code

@task_bp.route('/checklist', methods=['GET'])
@token_required
def get_checklist(current_user):
    # Read date parameter (default to today YYYY-MM-DD)
    date_str = request.args.get('date')
    if not date_str:
        # Generate default date string in YYYY-MM-DD
        date_str = datetime.utcnow().strftime('%Y-%m-%d')
        
    res, code = task_service.get_daily_checklist(date_str)
    return jsonify(res), code

@task_bp.route('/checklist/toggle', methods=['POST'])
@token_required
def toggle_execution(current_user):
    data = request.get_json() or {}
    task_id = data.get('task_id')
    date_str = data.get('date')
    is_completed = data.get('is_completed')
    
    if not task_id or not date_str or is_completed is None:
        return jsonify({'status': 'error', 'message': 'task_id, date, dan is_completed wajib diisi'}), 400
        
    res, code = task_service.toggle_task_execution(task_id, date_str, current_user.id, is_completed)
    return jsonify(res), code

@task_bp.route('/checklist/reset', methods=['POST'])
@token_required
def reset_checklist(current_user):
    data = request.get_json() or {}
    date_str = data.get('date')

    if not date_str:
        return jsonify({'status': 'error', 'message': 'date wajib diisi'}), 400

    res, code = task_service.reset_daily_checklist(date_str, current_user.id)
    return jsonify(res), code
