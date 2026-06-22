import os
from flask import current_app
from flask_socketio import SocketIO


def parse_cors_origins(value):
    if not value or value == '*':
        return '*'

    origins = [item.strip() for item in value.split(',') if item.strip()]
    return origins or '*'


socketio = SocketIO(
    async_mode=os.getenv('SOCKETIO_ASYNC_MODE', 'threading'),
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False,
)


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
