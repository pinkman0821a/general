from flask import Blueprint, request, jsonify
from ..models import last_seen, onlineUsers, create_hall, add_user_to_hall, create_message, get_messages_by_hall, get_user_halls

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

@chat_bp.route('/create-hall', methods=['POST'])
def create_hall_route():
    data = request.get_json()
    hall_name = data.get('hall_name')
    
    if not hall_name:
        return jsonify({"error": "Hall name is required."}), 400
    created = create_hall(hall_name)
    if not created:
        return jsonify({"error": "Failed to create hall."}), 500
    return jsonify({"message": "Hall created successfully."}), 201

@chat_bp.route('/add-user-to-hall', methods=['POST'])
def add_user_to_hall_route():
    data = request.get_json()
    user_id = data.get('user_id')
    hall_id = data.get('hall_id')
    
    if not user_id or not hall_id:
        return jsonify({"error": "User ID and Hall ID are required."}), 400
    added = add_user_to_hall(user_id, hall_id)
    if not added:
        return jsonify({"error": "Failed to add user to hall."}), 500
    return jsonify({"message": "User added to hall successfully."}), 200

@chat_bp.route('/create-message', methods=['POST'])
def create_message_route():
    data = request.get_json()
    sender_id = data.get('sender_id')
    hall_id = data.get('hall_id')
    content = data.get('content')
    
    if not sender_id or not hall_id or not content:
        return jsonify({"error": "Sender ID, Hall ID, and content are required."}), 400
    created = create_message(sender_id, hall_id, content)
    if not created:
        return jsonify({"error": "Failed to create message."}), 500
    return jsonify({"message": "Message created successfully."}), 201 

@chat_bp.route('/messages/<int:hall_id>', methods=['GET'])
def get_messages(hall_id):
    
    messages = get_messages_by_hall(hall_id)
    return jsonify({"messages": messages}), 200

@chat_bp.route('/user-halls/<int:user_id>', methods=['GET'])
def get_user(user_id):
    halls = get_user_halls(user_id)
    return jsonify({"halls": halls}), 200