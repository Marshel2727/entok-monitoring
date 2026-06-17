# app/routes/task_routes.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.utils.cache import cached_json
from app.service import task_service
from app.schemas import ChecklistToggleSchema, DateOnlySchema, TaskSchema, load_or_error
from app.utils.helpers import get_wita_date_string

task_bp = Blueprint('task_bp', __name__)

@task_bp.route('', methods=['GET'])
@cached_json(ttl_seconds=30, public=True, vary_auth=False)
def get_tasks():
    res, code = task_service.get_all_tasks()
    return jsonify(res), code

@task_bp.route('', methods=['POST'])
@token_required
@roles_allowed('PENGAWAS')
def save_task(current_user):
    data, error = load_or_error(TaskSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

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
@cached_json(ttl_seconds=10)
def get_checklist(current_user):
    # Read date parameter (default to today YYYY-MM-DD)
    date_str = request.args.get('date')
    if not date_str:
        # Generate default date string in YYYY-MM-DD
        date_str = get_wita_date_string()
        
    res, code = task_service.get_daily_checklist(date_str)
    return jsonify(res), code

@task_bp.route('/checklist/toggle', methods=['POST'])
@token_required
def toggle_execution(current_user):
    data, error = load_or_error(ChecklistToggleSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    task_id = data.get('task_id')
    date_str = data.get('date')
    is_completed = data.get('is_completed')
        
    res, code = task_service.toggle_task_execution(task_id, date_str, current_user.id, is_completed)
    return jsonify(res), code

@task_bp.route('/checklist/reset', methods=['POST'])
@token_required
def reset_checklist(current_user):
    data, error = load_or_error(DateOnlySchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    date_str = data.get('date')

    res, code = task_service.reset_daily_checklist(date_str, current_user.id)
    return jsonify(res), code
