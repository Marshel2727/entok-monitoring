# app/routes/activity_routes.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.service import activity_service

activity_bp = Blueprint('activity_bp', __name__)

@activity_bp.route('', methods=['GET'])
@token_required
@roles_allowed('PENGAWAS')
def get_logs(current_user):
    res, code = activity_service.get_all_logs()
    return jsonify(res), code

@activity_bp.route('', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def clear_logs(current_user):
    res, code = activity_service.clear_logs(current_user.id)
    return jsonify(res), code
