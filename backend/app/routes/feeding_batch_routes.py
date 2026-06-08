from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required
from app.service import feeding_batch_service

feeding_batch_bp = Blueprint('feeding_batch_bp', __name__)


@feeding_batch_bp.route('/today', methods=['GET'])
@token_required
def get_today_batch(current_user):
    date_str = request.args.get('date')
    res, code = feeding_batch_service.get_today_batch(date_str)
    return jsonify(res), code


@feeding_batch_bp.route('', methods=['POST'])
@token_required
def create_batch(current_user):
    data = request.get_json() or {}
    res, code = feeding_batch_service.create_batch(current_user.id, data.get('date'))
    return jsonify(res), code


@feeding_batch_bp.route('/scale-readings', methods=['POST'])
def record_scale_reading():
    """
    Endpoint perangkat Timbangan 2.
    Body: { timbangan_id, phase/fase, label/feed_name, value/amount, mode?: SET|ADD, date? }
    """
    data = request.get_json() or {}
    res, code = feeding_batch_service.record_scale_reading(data)
    return jsonify(res), code


@feeding_batch_bp.route('/<batch_id>/weights', methods=['POST'])
@token_required
def record_weight(current_user, batch_id):
    data = request.get_json() or {}
    ingredient_id = data.get('ingredient_id')
    amount = data.get('amount')

    if not ingredient_id:
        return jsonify({'status': 'error', 'message': 'ingredient_id wajib diisi'}), 400

    res, code = feeding_batch_service.record_weight(
        batch_id,
        ingredient_id,
        amount,
        current_user.id,
        data.get('timbangan_id', 2)
    )
    return jsonify(res), code


@feeding_batch_bp.route('/<batch_id>/finalize', methods=['POST'])
@token_required
def finalize_batch(current_user, batch_id):
    res, code = feeding_batch_service.finalize_batch(batch_id, current_user.id)
    return jsonify(res), code


@feeding_batch_bp.route('/<batch_id>/cancel', methods=['POST'])
@token_required
def cancel_batch(current_user, batch_id):
    res, code = feeding_batch_service.cancel_batch(batch_id, current_user.id)
    return jsonify(res), code
