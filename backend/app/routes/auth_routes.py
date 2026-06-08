# app/routes/auth_routes.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.service import auth_service

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'status': 'error', 'message': 'Username dan password wajib diisi'}), 400
        
    res, code = auth_service.login_user(username, password)
    return jsonify(res), code

@auth_bp.route('/register', methods=['POST'])
@token_required
@roles_allowed('PENGAWAS')
def register(current_user):
    data = request.get_json() or {}
    # Capture who registered this user
    data['user_id'] = current_user.id
    
    res, code = auth_service.register_user(data)
    return jsonify(res), code

@auth_bp.route('/users', methods=['GET'])
@token_required
@roles_allowed('PENGAWAS')
def get_users(current_user):
    res, code = auth_service.get_all_users()
    return jsonify(res), code

@auth_bp.route('/users/<user_id>', methods=['PUT'])
@token_required
@roles_allowed('PENGAWAS')
def update_user(current_user, user_id):
    data = request.get_json() or {}
    res, code = auth_service.update_user(user_id, data)
    return jsonify(res), code

@auth_bp.route('/users/<user_id>', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def delete_user(current_user, user_id):
    res, code = auth_service.delete_user(user_id)
    return jsonify(res), code
