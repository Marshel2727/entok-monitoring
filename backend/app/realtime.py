import os
import jwt
from flask import current_app
from flask_socketio import SocketIO


def parse_cors_origins(value, allow_wildcard=True):
    if not value or value == '*':
        if allow_wildcard:
            return '*'
        raise RuntimeError('Wildcard CORS tidak diizinkan pada environment production')

    origins = [item.strip() for item in value.split(',') if item.strip()]
    if origins:
        return origins
    if allow_wildcard:
        return '*'
    raise RuntimeError('Minimal satu FRONTEND_URL wajib dikonfigurasi')


socketio = SocketIO(
    async_mode=os.getenv('SOCKETIO_ASYNC_MODE', 'threading'),
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False,
)


@socketio.on('connect')
def authenticate_socket(auth):
    token = (auth or {}).get('token') if isinstance(auth, dict) else None
    if not token:
        return False
    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        from app.models.user import User
        user = User.query.get(payload.get('sub'))
        if not user or user.status == 'NONAKTIF':
            return False
    except jwt.PyJWTError:
        return False
    return True


def init_realtime(app, cors_origins):
    socketio.init_app(app, cors_allowed_origins=cors_origins)


def emit_realtime_event(event_name, payload=None):
    try:
        socketio.emit(event_name, payload or {})
    except Exception as exc:
        try:
            current_app.logger.warning('Realtime event "%s" failed: %s', event_name, exc)
        except RuntimeError:
            pass
