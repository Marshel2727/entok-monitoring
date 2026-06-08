# app/service/auth_service.py
import jwt
from datetime import datetime, timedelta
from flask import current_app
from app.utils.db import db
from app.models.user import User

def generate_token(user):
    """Generates a JWT Token for the logged in user, valid for 24 hours."""
    payload = {
        'exp': datetime.utcnow() + timedelta(days=1),
        'iat': datetime.utcnow(),
        'sub': user.id,
        'role': user.role,
        'name': user.name
    }
    return jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )

def login_user(username, password):
    """Verifies user credentials and returns details with token."""
    user = User.query.filter_by(username=username.lower().strip()).first()
    
    if not user or not user.check_password(password):
        return {'status': 'error', 'message': 'Username atau password salah'}, 400
        
    if user.status == 'NONAKTIF':
        return {'status': 'error', 'message': 'Akun Anda dinonaktifkan. Silakan hubungi pengawas.'}, 403
        
    token = generate_token(user)
    return {
        'status': 'success',
        'message': 'Login berhasil',
        'data': {
            'token': token,
            'user': user.to_dict()
        }
    }, 200

def register_user(data):
    """Creates a new user account (keeper or supervisor)."""
    username = data.get('username', '').lower().strip()
    name = data.get('name', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'PENJAGA')
    shift = data.get('shift')
    email = data.get('email')

    if not name or not username or not password:
        return {'status': 'error', 'message': 'Nama, username, dan password wajib diisi'}, 400

    # Check if username already exists
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return {'status': 'error', 'message': f'Username "{username}" sudah terdaftar'}, 400

    if email:
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            return {'status': 'error', 'message': 'Email sudah digunakan'}, 400

    new_user = User(
        name=name,
        username=username,
        role=role,
        shift=shift,
        email=email,
        status=data.get('status', 'AKTIF')
    )
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return {
        'status': 'success',
        'message': 'Akun berhasil didaftarkan',
        'data': new_user.to_dict()
    }, 201

def update_user(user_id, data):
    """Updates an existing user's credentials or status."""
    user = User.query.get(user_id)
    if not user:
        return {'status': 'error', 'message': 'Pengguna tidak ditemukan'}, 404

    # Update name, shift, role, status
    if 'name' in data:
        user.name = data['name'].strip()
    if 'username' in data:
        username = data['username'].lower().strip()
        if not username:
            return {'status': 'error', 'message': 'Username wajib diisi'}, 400
        existing_user = User.query.filter_by(username=username).first()
        if existing_user and existing_user.id != user_id:
            return {'status': 'error', 'message': f'Username "{username}" sudah terdaftar'}, 400
        user.username = username
    if 'shift' in data:
        user.shift = data['shift']
    if 'role' in data:
        user.role = data['role']
    if 'status' in data:
        user.status = data['status']
    if 'email' in data:
        user.email = data['email'].strip() if data['email'] else None

    # Handle optional password update
    if 'password' in data and data['password'].strip():
        user.set_password(data['password'].strip())

    db.session.commit()
    return {
        'status': 'success',
        'message': 'Akun berhasil diperbarui',
        'data': user.to_dict()
    }, 200

def delete_user(user_id):
    """Deletes a user account from the system."""
    user = User.query.get(user_id)
    if not user:
        return {'status': 'error', 'message': 'Pengguna tidak ditemukan'}, 404

    db.session.delete(user)
    db.session.commit()
    return {
        'status': 'success',
        'message': 'Akun berhasil dihapus'
    }, 200

def get_all_users():
    """Retrieves all registered users."""
    users = User.query.all()
    return {
        'status': 'success',
        'data': [user.to_dict() for user in users]
    }, 200
