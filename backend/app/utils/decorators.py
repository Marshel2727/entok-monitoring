# app/utils/decorators.py
import hmac
import jwt
from functools import wraps
from flask import request, jsonify, current_app
from app.models.user import User


def _get_bearer_token():
    if 'Authorization' not in request.headers:
        return None

    auth_header = request.headers['Authorization'].split(" ")
    if len(auth_header) == 2 and auth_header[0] == 'Bearer':
        return auth_header[1]
    return None


def _get_current_user_from_token(token):
    data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
    current_user = User.query.filter_by(id=data['sub']).first()
    if not current_user:
        return None, jsonify({'status': 'error', 'message': 'Pengguna tidak valid'}), 401
    if current_user.status == 'NONAKTIF':
        return None, jsonify({'status': 'error', 'message': 'Akun dinonaktifkan'}), 403
    return current_user, None, None


def _is_valid_device_key():
    expected_key = current_app.config.get('IOT_DEVICE_API_KEY') or ''
    if not expected_key:
        return False

    provided_key = request.headers.get('X-Device-Key', '')
    return bool(provided_key and hmac.compare_digest(provided_key, expected_key))

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _get_bearer_token()
                
        if not token:
            return jsonify({'status': 'error', 'message': 'Token otentikasi tidak ditemukan'}), 401
            
        try:
            current_user, error_response, status_code = _get_current_user_from_token(token)
            if error_response:
                return error_response, status_code
        except jwt.ExpiredSignatureError:
            return jsonify({'status': 'error', 'message': 'Token telah kedaluwarsa'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'status': 'error', 'message': 'Token tidak valid'}), 401
            
        return f(current_user, *args, **kwargs)
        
    return decorated

def roles_allowed(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            # Check user role
            if current_user.role not in roles:
                return jsonify({
                    'status': 'error', 
                    'message': f'Hak akses ditolak. Diperlukan peran: {", ".join(roles)}'
                }), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator

def device_key_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        expected_key = current_app.config.get('IOT_DEVICE_API_KEY') or ''
        if not expected_key:
            return jsonify({
                'status': 'error',
                'message': 'API key perangkat belum dikonfigurasi di server'
            }), 503

        provided_key = request.headers.get('X-Device-Key', '')
        if not provided_key or not hmac.compare_digest(provided_key, expected_key):
            return jsonify({
                'status': 'error',
                'message': 'API key perangkat tidak valid'
            }), 401

        return f(*args, **kwargs)

    return decorated

def device_key_or_token_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if _is_valid_device_key():
                return f(*args, **kwargs)

            token = _get_bearer_token()
            if not token:
                return jsonify({
                    'status': 'error',
                    'message': 'API key perangkat atau token otentikasi wajib dikirim'
                }), 401

            try:
                current_user, error_response, status_code = _get_current_user_from_token(token)
                if error_response:
                    return error_response, status_code
            except jwt.ExpiredSignatureError:
                return jsonify({'status': 'error', 'message': 'Token telah kedaluwarsa'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'status': 'error', 'message': 'Token tidak valid'}), 401

            if roles and current_user.role not in roles:
                return jsonify({
                    'status': 'error',
                    'message': f'Hak akses ditolak. Diperlukan peran: {", ".join(roles)}'
                }), 403

            return f(*args, **kwargs)

        return decorated

    return decorator
