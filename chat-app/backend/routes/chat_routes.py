from flask import Blueprint, request, jsonify
from ..models import last_seen, onlineUsers

# Define a Blueprint for chat routes
chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/ping', methods=['POST'])
def ping():
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required."}), 400
    updated = last_seen(user_id)
    if not updated:
        return jsonify({"error": "Failed to update last seen."}), 500
    
    return jsonify({"message": "Last seen updated."}), 200

@chat_bp.route('/online-users', methods=['GET'])
def get_online_users():
    users = onlineUsers()
    return jsonify({"online_users": users}), 200