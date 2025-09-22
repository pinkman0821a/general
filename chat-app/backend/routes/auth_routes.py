from flask import Blueprint, request, jsonify
from ..utils.auth import validate_registration, hash_password, check_password, create_jwt
from ..models import create_user, get_user_by_username, last_seen, onlineUsers
from dotenv import load_dotenv
import os
load_dotenv()

secret = os.getenv('JWT_SECRET')
exp_seconds = int(os.getenv('JWT_EXP_DELTA_SECONDS', 3600))
# Define a Blueprint for authentication routes
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Validate the registration input
    is_valid, message = validate_registration(username, password)
    if not is_valid:
        return jsonify({"error": message}), 400

    # Check if the username already exists
    if get_user_by_username(username):
        return jsonify({"error": "Username already exists."}), 409
    
    # Hash the password
    password_hash = hash_password(password)

    # Create the user in the database
    created = create_user(username, password_hash)
    if not created:
        return jsonify({"error": "Failed to create user."}), 500
    return jsonify({"message": "User registered successfully."}), 201

# Login route with JWT token generation
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    # Basic input validation
    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400
    # Fetch the user from the database
    user = get_user_by_username(username)
    if not user:
        return jsonify({"error": "Invalid username or password."}), 401
    # Check the password
    if not check_password(password, user['password_hash']):
        return jsonify({"error": "Invalid username or password."}), 401
    # Create a JWT token
    token = create_jwt(user['id'], secret=secret, exp_delta_seconds=exp_seconds)
    # Return the token in the response
    response = jsonify({"message": "Login successful.", "token": token, "user": {"id": user['id'], "username": user['username']}})
    response.status_code = 200
    response.set_cookie('token', token, httponly=True, samesite='Lax')
    return response

