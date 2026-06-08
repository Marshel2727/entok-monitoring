# app/routes/feed_routes.py
from flask import Blueprint, request, jsonify
from app.utils.decorators import token_required, roles_allowed
from app.service import feed_service

feed_bp = Blueprint('feed_bp', __name__)

@feed_bp.route('', methods=['GET'])
def get_feeds():
    res, code = feed_service.get_all_feeds()
    return jsonify(res), code

@feed_bp.route('/<feed_id>', methods=['GET'])
def get_feed(feed_id):
    res, code = feed_service.get_feed_by_id(feed_id)
    return jsonify(res), code

@feed_bp.route('', methods=['POST'])
@token_required
@roles_allowed('PENGAWAS')
def save_feed(current_user):
    data = request.get_json() or {}
    data['user_id'] = current_user.id
    
    # Check if id is passed in body for edit mode
    feed_id = data.get('id')
    
    res, code = feed_service.save_feed(feed_id, data)
    return jsonify(res), code

@feed_bp.route('/<feed_id>', methods=['DELETE'])
@token_required
@roles_allowed('PENGAWAS')
def delete_feed(current_user, feed_id):
    res, code = feed_service.delete_feed(feed_id, current_user.id)
    return jsonify(res), code

@feed_bp.route('/<feed_id>/restock', methods=['POST'])
@token_required
def restock_feed(current_user, feed_id):
    data = request.get_json() or {}
    amount = float(data.get('amount', 0.0))
    description = data.get('description', '')
    
    res, code = feed_service.restock_feed(feed_id, amount, description, current_user.id)
    return jsonify(res), code

@feed_bp.route('/transactions', methods=['GET'])
@token_required
@roles_allowed('PENGAWAS')
def get_transactions(current_user):
    feed_id = request.args.get('feed_id')
    res, code = feed_service.get_feed_transactions(feed_id)
    return jsonify(res), code
