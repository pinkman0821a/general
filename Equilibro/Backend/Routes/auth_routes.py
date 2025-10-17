from flask import jsonify, request, Blueprint
from dotenv import load_dotenv
from ..Utils.Auth import hashPassword, verifyPassword, validateRegistration, generateJwtToken
from ..Models.user_models import createUser, getUserByEmail, updateUserForm
import os

load_dotenv()

secret = os.getenv("JWT_SECRET")
expSeconds = int(os.getenv("JWT_EXP_SECONDS", 3600))

authBp = Blueprint('auth', __name__)

@authBp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    isValid, message = validateRegistration(name, email, password)
    if not isValid:
        return jsonify({"error": message}), 400

    if getUserByEmail(email):
        return jsonify({"error": "Email already registered."}), 400

    hashedPassword = hashPassword(password)

    created = createUser(name, email, hashedPassword)
    
    if not created:
        return jsonify({"error": "Error creating user."}), 500
    return jsonify({"message": "User created successfully."}), 201

@authBp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    # Validate required fields
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    # Find user by email
    user = getUserByEmail(email)
    print(user)

    if not user:
        return jsonify({"error": "Email is not registered."}), 400

    # user = (id, username, email, password_hash, creation_date, form)
    user_id = user[0]
    username = user[1]
    email = user[2]
    password_hash = user[3]
    form = user[5]
    

    # Verify password
    if not verifyPassword(password, password_hash):
        return jsonify({"error": "Incorrect password."}), 400

    # Variables for token
    secret = "your_super_secure_secret_key"
    exp_seconds = 3600  # 1 hour

    # Generate JWT token (correct parameter order)
    token = generateJwtToken(username, email, user_id, secret, exp_seconds)

    # Build response
    response = jsonify({
        "message": "Login successful.",
        "token": token,
        "user": {
            "id": user_id,
            "username": username,
            "form": form
            
        }
    })
    response.status_code = 200
    response.set_cookie('token', token, httponly=True, samesite='Lax')
    return response

@authBp.route('/updateUserFormStatus', methods=['POST'])
def updateUserFormStatus():
    data = request.get_json()
    user_id = data.get('user_id')

    # Validate required fields
    if not user_id:
        return jsonify({"error": "The user_id field is required."}), 400

    updated = updateUserForm(user_id)

    if updated:
        return jsonify({
            "message": "User form status updated successfully.",
            "data": {
                "user_id": user_id,
                "form_updated": True
            }
        }), 200
    else:
        return jsonify({"error": "Could not update form status. Check the data or try again later."}), 500