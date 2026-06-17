# app/routes/catalog_routes.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.service import catalog_service
from app.schemas import CatalogSchema, load_or_error

catalog_bp = Blueprint('catalog_bp', __name__)

@catalog_bp.route('', methods=['GET'])
def get_catalog():
    res, code = catalog_service.get_all_catalog()
    return jsonify(res), code

@catalog_bp.route('', methods=['POST'])
@token_required
@roles_allowed('PENGAWAS')
def save_catalog(current_user):
    data, error = load_or_error(CatalogSchema(), request.get_json())
    if error:
        return jsonify(error[0]), error[1]

    data['user_id'] = current_user.id
    
    # Check if id is passed in body for edit mode
    catalog_id = data.get('id')
    
    res, code = catalog_service.save_catalog(catalog_id, data)
    return jsonify(res), code

@catalog_bp.route('/<catalog_id>', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def delete_catalog(current_user, catalog_id):
    res, code = catalog_service.delete_catalog(catalog_id, current_user.id)
    return jsonify(res), code
