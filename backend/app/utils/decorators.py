# app/utils/decorators.py
import jwt
from functools import wraps
from flask import request, jsonify, current_app
from app.models.user import User

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization'].split(" ")
            if len(auth_header) == 2 and auth_header[0] == 'Bearer':
                token = auth_header[1]
                
        if not token:
            return jsonify({'status': 'error', 'message': 'Token otentikasi tidak ditemukan'}), 401
            
        try:
            # Decode the token
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['sub']).first()
            if not current_user:
                return jsonify({'status': 'error', 'message': 'Pengguna tidak valid'}), 401
            if current_user.status == 'NONAKTIF':
                return jsonify({'status': 'error', 'message': 'Akun dinonaktifkan'}), 403
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
