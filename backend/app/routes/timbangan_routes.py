# app/routes/timbangan_routes.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.service import timbangan_service

timbangan_bp = Blueprint('timbangan_bp', __name__)


# ==========================================
#  TIMBANGAN (Scale Registry)
# ==========================================

@timbangan_bp.route('', methods=['GET'])
@token_required
def get_all_timbangan(current_user):
    """GET /api/timbangan — Daftar semua timbangan."""
    res, code = timbangan_service.get_all_timbangan()
    return jsonify(res), code


@timbangan_bp.route('/<int:timbangan_id>', methods=['GET'])
@token_required
def get_timbangan(current_user, timbangan_id):
    """GET /api/timbangan/<id> — Detail satu timbangan."""
    res, code = timbangan_service.get_timbangan_by_id(timbangan_id)
    return jsonify(res), code


@timbangan_bp.route('', methods=['POST'])
@token_required
@roles_allowed('PENGAWAS')
def save_timbangan(current_user):
    """POST /api/timbangan — Daftarkan timbangan baru atau edit yang ada."""
    data = request.get_json() or {}
    data['user_id'] = current_user.id

    timbangan_id = data.get('id')

    res, code = timbangan_service.save_timbangan(timbangan_id, data)
    return jsonify(res), code


@timbangan_bp.route('/<int:timbangan_id>', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def delete_timbangan(current_user, timbangan_id):
    """DELETE /api/timbangan/<id> — Hapus timbangan beserta semua reading-nya."""
    res, code = timbangan_service.delete_timbangan(timbangan_id, current_user.id)
    return jsonify(res), code


@timbangan_bp.route('/<int:timbangan_id>/status', methods=['PATCH'])
@token_required
def update_status(current_user, timbangan_id):
    """PATCH /api/timbangan/<id>/status — Update status ONLINE/OFFLINE."""
    data = request.get_json() or {}
    new_status = data.get('status', '').upper()

    res, code = timbangan_service.update_timbangan_status(timbangan_id, new_status)
    return jsonify(res), code


# ==========================================
#  READINGS (Data Sensor dari ESP32)
# ==========================================

@timbangan_bp.route('/readings', methods=['POST'])
def add_reading():
    """
    POST /api/timbangan/readings — Terima data dari ESP32.
    
    Body: { timbangan_id: int, value: float, label?: string, unit?: string }
    
    CATATAN: Endpoint ini TIDAK memerlukan autentikasi JWT
    karena ESP32 mengirim data secara otomatis.
    Keamanan ditangani di level jaringan (whitelist IP / API key di header).
    """
    data = request.get_json() or {}

    res, code = timbangan_service.add_reading(data)
    return jsonify(res), code


@timbangan_bp.route('/readings', methods=['GET'])
@token_required
def get_readings(current_user):
    """
    GET /api/timbangan/readings — Ambil data pembacaan sensor.
    
    Query params:
    - timbangan_id: filter berdasarkan timbangan (opsional)
    - label: filter berdasarkan label/nama item (opsional)
    - limit: jumlah data maksimum (default: 100)
    """
    timbangan_id = request.args.get('timbangan_id', type=int)
    label = request.args.get('label', type=str)
    limit = request.args.get('limit', default=100, type=int)

    res, code = timbangan_service.get_readings(timbangan_id, label, limit)
    return jsonify(res), code


@timbangan_bp.route('/readings/latest', methods=['GET'])
@token_required
def get_latest_readings(current_user):
    """
    GET /api/timbangan/readings/latest — Pembacaan terakhir per label per timbangan.
    
    Query params:
    - timbangan_id: filter timbangan tertentu (opsional)
    """
    timbangan_id = request.args.get('timbangan_id', type=int)

    res, code = timbangan_service.get_latest_readings(timbangan_id)
    return jsonify(res), code


@timbangan_bp.route('/<int:timbangan_id>/readings/summary', methods=['GET'])
@token_required
def get_reading_summary(current_user, timbangan_id):
    """
    GET /api/timbangan/<id>/readings/summary — Ringkasan data untuk grafik.
    
    Query params:
    - period: 'day' | 'week' | 'month' (default: 'day')
    """
    period = request.args.get('period', default='day', type=str)

    res, code = timbangan_service.get_reading_summary(timbangan_id, period)
    return jsonify(res), code


@timbangan_bp.route('/readings/<reading_id>', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def delete_reading(current_user, reading_id):
    """DELETE /api/timbangan/readings/<id> — Hapus satu data reading."""
    res, code = timbangan_service.delete_reading(reading_id, current_user.id)
    return jsonify(res), code
