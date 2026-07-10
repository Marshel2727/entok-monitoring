from time import perf_counter

from flask import Blueprint, jsonify
from sqlalchemy import text

from app.models.timbangan import Timbangan
from app.realtime import socketio
from app.utils.db import db
from app.utils.decorators import roles_allowed, token_required
from app.utils.helpers import get_farm_timezone_name, get_local_time, utc_now_iso


system_bp = Blueprint('system_bp', __name__)


def _database_status():
    started = perf_counter()
    try:
        db.session.execute(text('SELECT 1'))
        return 'UP', round((perf_counter() - started) * 1000, 2), None
    except Exception as exc:
        db.session.rollback()
        return 'DOWN', round((perf_counter() - started) * 1000, 2), str(exc)


@system_bp.route('/status', methods=['GET'])
def public_status():
    database_status, latency_ms, _ = _database_status()
    status = 'UP' if database_status == 'UP' else 'DEGRADED'
    return jsonify({
        'status': status,
        'database': database_status,
        'database_latency_ms': latency_ms,
        'server_time_utc': utc_now_iso(),
    }), 200 if status == 'UP' else 503


@system_bp.route('/time', methods=['GET'])
def system_time():
    farm_now = get_local_time()
    return jsonify({
        'status': 'success',
        'server_time_utc': utc_now_iso(),
        'farm_time': farm_now.isoformat(timespec='seconds'),
        'farm_date': farm_now.date().isoformat(),
        'farm_timezone': get_farm_timezone_name(),
    }), 200


@system_bp.route('/health', methods=['GET'])
@token_required
@roles_allowed('PENGAWAS')
def detailed_health(current_user):
    database_status, latency_ms, database_error = _database_status()
    devices = [item.to_dict() for item in Timbangan.query.order_by(Timbangan.id.asc()).all()]
    online_count = sum(1 for item in devices if item['status'] == 'ONLINE')
    overall_status = 'UP' if database_status == 'UP' else 'DEGRADED'
    return jsonify({
        'status': 'success',
        'data': {
            'overall_status': overall_status,
            'database': {
                'status': database_status,
                'latency_ms': latency_ms,
                'error': database_error,
            },
            'realtime': {
                'status': 'UP',
                'async_mode': socketio.async_mode,
            },
            'devices': devices,
            'devices_online': online_count,
            'devices_total': len(devices),
            'server_time_utc': utc_now_iso(),
            'farm_time': get_local_time().isoformat(timespec='seconds'),
            'farm_timezone': get_farm_timezone_name(),
        },
    }), 200
