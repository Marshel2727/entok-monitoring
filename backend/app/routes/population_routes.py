# app/routes/population_routes.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.utils.cache import cached_json
from app.service import population_service
from app.schemas import PopulationSchema, load_or_error

population_bp = Blueprint('population_bp', __name__)

@population_bp.route('', methods=['GET'])
@cached_json(ttl_seconds=30, public=True, vary_auth=False)
def get_populations():
    res, code = population_service.get_current_populations()
    return jsonify(res), code

@population_bp.route('', methods=['POST'])
@token_required
@roles_allowed('PENGAWAS')
def update_population(current_user):
    data, error = load_or_error(PopulationSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    phase = data.get('fase')
    new_value = data.get('nilaiBaru')
    new_val_int = int(new_value)
        
    res, code = population_service.update_population(phase, new_val_int, current_user.id)
    return jsonify(res), code

@population_bp.route('/logs', methods=['GET'])
@token_required
@cached_json(ttl_seconds=15)
def get_logs(current_user):
    res, code = population_service.get_population_logs()
    return jsonify(res), code

@population_bp.route('/logs/<log_id>', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def delete_log(current_user, log_id):
    res, code = population_service.delete_population_log(log_id)
    return jsonify(res), code
