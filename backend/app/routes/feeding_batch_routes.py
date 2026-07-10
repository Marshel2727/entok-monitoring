from flask import Blueprint, request, jsonify
from app.utils.decorators import device_key_or_token_required, device_key_required, token_required
from app.utils.cache import cached_json
from app.utils.rate_limit import rate_limit
from app.service import feeding_batch_service
from app.schemas import (
    FeedingBatchScaleReadingBulkSchema,
    FeedingBatchScaleReadingSchema,
    FeedingBatchSchema,
    FeedingBatchWeightSchema,
    load_or_error,
)

feeding_batch_bp = Blueprint('feeding_batch_bp', __name__)


@feeding_batch_bp.route('/today', methods=['GET'])
@token_required
@cached_json(ttl_seconds=5)
def get_today_batch(current_user):
    date_str = request.args.get('date')
    task_id = request.args.get('task_id')
    task_execution_id = request.args.get('task_execution_id')
    if request.args.get('all') in ('1', 'true', 'TRUE', 'yes'):
        res, code = feeding_batch_service.get_today_batches(date_str)
    else:
        res, code = feeding_batch_service.get_today_batch(date_str, task_id, task_execution_id)
    return jsonify(res), code


@feeding_batch_bp.route('', methods=['POST'])
@token_required
def create_batch(current_user):
    data, error = load_or_error(FeedingBatchSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    res, code = feeding_batch_service.create_batch(
        current_user.id,
        data.get('date'),
        data.get('task_id'),
        data.get('task_execution_id')
    )
    return jsonify(res), code


@feeding_batch_bp.route('/scale-map', methods=['GET'])
@device_key_required
@rate_limit('DEVICE_RATE_LIMIT', 60)
@cached_json(ttl_seconds=5, public=True, vary_auth=False)
def get_scale_map():
    """
    Endpoint perangkat Timbangan 2 untuk mengambil urutan timbang.
    Query: timbangan_id=2&date=YYYY-MM-DD
    """
    timbangan_id = request.args.get('timbangan_id', default=2, type=int)
    date_str = request.args.get('date')
    batch_id = request.args.get('batch_id')

    res, code = feeding_batch_service.get_scale_map(timbangan_id, date_str, batch_id=batch_id)
    return jsonify(res), code


@feeding_batch_bp.route('/scale-readings', methods=['POST'])
@device_key_or_token_required('PENGAWAS')
@rate_limit('DEVICE_RATE_LIMIT', 60)
def record_scale_reading():
    """
    Endpoint perangkat Timbangan 2.
    Body: { batch_id?, timbangan_id, phase/fase, label/feed_name, value/amount, mode?: SET|ADD, date? }
    """
    data, error = load_or_error(FeedingBatchScaleReadingSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    res, code = feeding_batch_service.record_scale_reading(data)
    return jsonify(res), code


@feeding_batch_bp.route('/scale-readings/bulk', methods=['POST'])
@device_key_or_token_required('PENGAWAS')
@rate_limit('DEVICE_RATE_LIMIT', 60)
def record_scale_readings_bulk():
    """
    Endpoint bulk perangkat Timbangan 2.
    Body: { batch_id?, timbangan_id?, date?, mode?: SET|ADD, items: [{ phase/fase, label/feed_name, value/amount }] }
    """
    data, error = load_or_error(FeedingBatchScaleReadingBulkSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    res, code = feeding_batch_service.record_scale_readings_bulk(data)
    return jsonify(res), code


@feeding_batch_bp.route('/<batch_id>/weights', methods=['POST'])
@token_required
def record_weight(current_user, batch_id):
    data, error = load_or_error(FeedingBatchWeightSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    ingredient_id = data.get('ingredient_id')
    amount = data.get('amount')

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
