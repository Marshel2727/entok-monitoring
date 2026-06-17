# app/routes/formulation_routes.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.service import formulation_service
from app.schemas import FormulationSchema, load_or_error

formulation_bp = Blueprint('formulation_bp', __name__)

@formulation_bp.route('', methods=['GET'])
def get_formulations():
    res, code = formulation_service.get_all_formulations()
    return jsonify(res), code

@formulation_bp.route('/<form_id>', methods=['GET'])
def get_formulation(form_id):
    res, code = formulation_service.get_formulation_by_id(form_id)
    return jsonify(res), code

@formulation_bp.route('', methods=['POST'])
@token_required
@roles_allowed('PENGAWAS')
def save_formulation(current_user):
    data, error = load_or_error(FormulationSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    data['user_id'] = current_user.id
    
    # Check if id is passed in body for edit mode
    form_id = data.get('id')
    
    res, code = formulation_service.save_formulation(form_id, data)
    return jsonify(res), code

@formulation_bp.route('/<form_id>', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def delete_formulation(current_user, form_id):
    res, code = formulation_service.delete_formulation(form_id, current_user.id)
    return jsonify(res), code
