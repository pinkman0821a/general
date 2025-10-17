from flask import jsonify, request, Blueprint
from dotenv import load_dotenv
from ..Utils.Auth import HashContrasena, VerificarContrasena, ValidarRegistro, GenerarTokenJWT
from ..Models.Models import CrearUsuario, ObtenerUsuarioPorCorreo
import os

load_dotenv()

secret = os.getenv("JWT_SECRET")
exp_seconds = int(os.getenv("JWT_EXP_SECONDS", 3600))

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    nombre = data.get('nombre')
    correo = data.get('correo')
    contrasena = data.get('contrasena')

    is_valid, message = ValidarRegistro(nombre, correo, contrasena)
    if not is_valid:
        return jsonify({"error": message}), 400

    if ObtenerUsuarioPorCorreo(correo):
        return jsonify({"error": "El correo ya está registrado."}), 400

    hashed_contrasena = HashContrasena(contrasena)

    created = CrearUsuario(nombre, correo, hashed_contrasena)
    
    if not created:
        return jsonify({"error": "Error al crear el usuario."}), 500
    return jsonify({"message": "Usuario creado exitosamente."}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    correo = data.get('correo')
    contrasena = data.get('contrasena')

    # Validación de campos requeridos
    if not correo or not contrasena:
        return jsonify({"error": "Correo y contraseña son requeridos."}), 400

    # Buscar el usuario por correo
    user = ObtenerUsuarioPorCorreo(correo)
    print(user)

    if not user:
        return jsonify({"error": "El correo no está registrado."}), 400

    # user = (id, username, correo, contrasena_hash, fecha_creacion)
    user_id = user[0]
    username = user[1]
    correo = user[2]
    contrasena_hash = user[3]
    formulario = user[5]
    

    # Verificar contraseña
    if not VerificarContrasena(contrasena, contrasena_hash):
        return jsonify({"error": "Contraseña incorrecta."}), 400

    # Variables para el token
    secret = "tu_clave_secreta_super_segura"
    exp_seconds = 3600  # 1 hora

    # Generar token JWT (orden correcto de parámetros)
    token = GenerarTokenJWT(username, correo, user_id, secret, exp_seconds)

    # Construir respuesta
    response = jsonify({
        "message": "Login exitoso.",
        "token": token,
        "user": {
            "id": user_id,
            "username": username,
            "formulario": formulario
            
        }
    })
    response.status_code = 200
    response.set_cookie('token', token, httponly=True, samesite='Lax')
    return response

