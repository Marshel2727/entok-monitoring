# app/routes/auth_routes.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.utils.cache import cached_json
from app.service import auth_service
from app.schemas import LoginSchema, PublicRegisterSchema, UserSchema, UserUpdateSchema, load_or_error

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User Login
    ---
    tags:
      - Authentication
    summary: Authenticate a user and return a JWT token.
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
              description: The user's username.
              example: "pengawas"
            password:
              type: string
              description: The user's password.
              example: "password"
    responses:
      200:
        description: Login successful, returns a JWT token.
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            token:
              type: string
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      400:
        description: Bad Request, username or password not provided.
      401:
        description: Unauthorized, invalid credentials.
    """
    data, error = load_or_error(LoginSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    username = data.get('username')
    password = data.get('password')
        
    res, code = auth_service.login_user(username, password)
    return jsonify(res), code

@auth_bp.route('/register', methods=['POST'])
@token_required
@roles_allowed('PENGAWAS')
def register(current_user):
    data, error = load_or_error(UserSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    # Capture who registered this user
    data['user_id'] = current_user.id
    
    res, code = auth_service.register_user(data)
    return jsonify(res), code

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data, error = load_or_error(UserUpdateSchema(partial=True), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    res, code = auth_service.update_profile(current_user.id, data)
    return jsonify(res), code

@auth_bp.route('/register-public', methods=['POST'])
def register_public():
    data, error = load_or_error(PublicRegisterSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    data['role'] = 'PENJAGA'
    data['status'] = 'AKTIF'

    res, code = auth_service.register_user(data)
    return jsonify(res), code

@auth_bp.route('/users', methods=['GET'])
@token_required
@roles_allowed('PENGAWAS')
@cached_json(ttl_seconds=30)
def get_users(current_user):
    res, code = auth_service.get_all_users()
    return jsonify(res), code

@auth_bp.route('/users/<user_id>', methods=['PUT'])
@token_required
@roles_allowed('PENGAWAS')
def update_user(current_user, user_id):
    data, error = load_or_error(UserUpdateSchema(partial=True), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    res, code = auth_service.update_user(user_id, data)
    return jsonify(res), code

@auth_bp.route('/users/<user_id>', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def delete_user(current_user, user_id):
    res, code = auth_service.delete_user(user_id)
    return jsonify(res), code
