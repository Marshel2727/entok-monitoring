# app/routes/population_routes.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.service import population_service

population_bp = Blueprint('population_bp', __name__)

@population_bp.route('', methods=['GET'])
def get_populations():
    res, code = population_service.get_current_populations()
    return jsonify(res), code

@population_bp.route('', methods=['POST'])
@token_required
@roles_allowed('PENGAWAS')
def update_population(current_user):
    data = request.get_json() or {}
    phase = data.get('fase')
    new_value = data.get('nilaiBaru')
    
    if not phase or new_value is None:
        return jsonify({'status': 'error', 'message': 'Fase usia dan jumlah ekor (nilaiBaru) wajib diisi'}), 400
        
    try:
        new_val_int = int(new_value)
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Jumlah ekor harus berupa angka bulat'}), 400
        
    res, code = population_service.update_population(phase, new_val_int, current_user.id)
    return jsonify(res), code

@population_bp.route('/logs', methods=['GET'])
@token_required
def get_logs(current_user):
    res, code = population_service.get_population_logs()
    return jsonify(res), code

@population_bp.route('/logs/<log_id>', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def delete_log(current_user, log_id):
    res, code = population_service.delete_population_log(log_id)
    return jsonify(res), code
