# app/utils/decorators.py
import hmac
import hashlib
import jwt
from functools import wraps
from flask import request, jsonify, current_app, g
from app.models.user import User
from app.models.timbangan import Timbangan


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


def _device_id_from_request():
    raw_id = request.headers.get('X-Device-Id')
    if not raw_id and request.view_args:
        raw_id = request.view_args.get('timbangan_id')
    if not raw_id:
        raw_id = request.args.get('timbangan_id')
    if not raw_id and request.is_json:
        payload = request.get_json(silent=True) or {}
        raw_id = payload.get('timbangan_id')
    try:
        return int(raw_id) if raw_id is not None else None
    except (TypeError, ValueError):
        return None


def _authenticate_device_key():
    provided_key = request.headers.get('X-Device-Key', '').strip()
    device_id = _device_id_from_request()

    if not provided_key:
        return False, 'DEVICE_KEY_MISSING', 'API key perangkat wajib dikirim'

    if device_id:
        device = Timbangan.query.get(device_id)
        if not device:
            return False, 'DEVICE_NOT_FOUND', 'Perangkat timbangan tidak terdaftar'
        if device.device_key_revoked_at:
            return False, 'DEVICE_KEY_REVOKED', 'API key perangkat sudah dicabut'
        if device.device_key_hash:
            provided_hash = hashlib.sha256(provided_key.encode('utf-8')).hexdigest()
            if hmac.compare_digest(provided_hash, device.device_key_hash):
                g.current_device = device
                return True, None, None
            return False, 'DEVICE_KEY_INVALID', 'API key perangkat tidak valid'

    allow_legacy = bool(current_app.config.get('ALLOW_LEGACY_DEVICE_KEY'))
    expected_key = current_app.config.get('IOT_DEVICE_API_KEY') or ''
    if allow_legacy and expected_key and hmac.compare_digest(provided_key, expected_key):
        if device_id:
            g.current_device = Timbangan.query.get(device_id)
        return True, None, None

    if not expected_key and not device_id:
        return False, 'DEVICE_KEY_NOT_CONFIGURED', 'API key perangkat belum dikonfigurasi di server'
    return False, 'DEVICE_KEY_INVALID', 'API key perangkat tidak valid'


def _is_valid_device_key():
    valid, _, _ = _authenticate_device_key()
    return valid

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
        valid, error_code, message = _authenticate_device_key()
        if not valid:
            status_code = 503 if error_code == 'DEVICE_KEY_NOT_CONFIGURED' else 401
            return jsonify({'status': 'error', 'code': error_code, 'message': message}), status_code

        return f(*args, **kwargs)

    return decorated

def device_key_or_token_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            valid_device, device_error_code, device_error_message = _authenticate_device_key()
            if valid_device:
                return f(*args, **kwargs)

            token = _get_bearer_token()
            if not token:
                return jsonify({
                    'status': 'error',
                    'code': device_error_code or 'AUTH_REQUIRED',
                    'message': device_error_message or 'API key perangkat atau token otentikasi wajib dikirim'
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
