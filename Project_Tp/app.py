from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO, emit
from db import get_db_connection
from datetime import datetime
import mysql.connector

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")


# 🔑 LOGIN
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data['username']
    password = data['password']

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE username=%s", (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user and password == user['password_hash']:
        return jsonify({"success": True, "user_id": user['id']})
    return jsonify({"success": False}), 401


# 🔥 SOCKET.IO MENSAJES
@socketio.on('mensaje')
def handle_message(data):
    user_id = data['user_id']
    mensaje = data['mensaje']
    fecha = datetime.now().date()
    hora = datetime.now().time()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO mensajes (user_id, mensaje, fecha, hora) VALUES (%s, %s, %s, %s)",
        (user_id, mensaje, fecha, hora)
    )
    mensaje_id = cursor.lastrowid  # 👈 capturamos el ID autoincremental
    conn.commit()
    cursor.close()
    conn.close()

    # agregamos el id al payload que se emite
    data['id'] = mensaje_id

    socketio.emit('mensaje', data)



# 🔥 PÁGINA PRINCIPAL
@app.route('/')
def index():
    return render_template('login.html')


# 📩 OBTENER TODOS LOS MENSAJES
@app.route('/mensajes', methods=['GET'])
def get_mensajes():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.id, m.mensaje, m.fecha, m.hora, m.user_id, u.username
        FROM mensajes m
        JOIN usuarios u ON m.user_id = u.id
        ORDER BY m.fecha ASC, m.hora ASC
    """)

    mensajes = cursor.fetchall()
    cursor.close()
    conn.close()

    for m in mensajes:
        m["fecha"] = m["fecha"].strftime("%Y-%m-%d") if m["fecha"] else None
        m["hora"] = str(m["hora"]) if m["hora"] else None

    return jsonify(mensajes)


# 📩 OBTENER MENSAJES POR USUARIO
@app.route('/mensajes/<int:user_id>', methods=['GET'])
def get_mensajes_by_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.id, m.mensaje, m.fecha, m.hora, m.user_id, u.username
        FROM mensajes m
        JOIN usuarios u ON m.user_id = u.id
        WHERE m.user_id = %s
        ORDER BY m.fecha ASC, m.hora ASC
    """, (user_id,))

    mensajes = cursor.fetchall()
    cursor.close()
    conn.close()

    for m in mensajes:
        m["fecha"] = m["fecha"].strftime("%Y-%m-%d") if m["fecha"] else None
        m["hora"] = str(m["hora"]) if m["hora"] else None

    return jsonify(mensajes)


# ✏️ CREAR MENSAJE
@app.route('/mensajes', methods=['POST'])
def create_mensaje():
    data = request.json
    user_id = data['user_id']
    mensaje = data['mensaje']
    fecha = datetime.now().date()
    hora = datetime.now().time()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO mensajes (user_id, mensaje, fecha, hora) VALUES (%s, %s, %s, %s)",
        (user_id, mensaje, fecha, hora)
    )
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"success": True, "mensaje": mensaje}), 201


# 🗑️ BORRAR MENSAJE ESPECIFICO
@app.route('/mensajes/<int:mensaje_id>', methods=['DELETE'])
def delete_mensaje(mensaje_id):
    data = request.get_json(silent=True) or {}
    requester_id = data.get('user_id')  # viene del frontend (localStorage)

    if requester_id is None:
        return jsonify({"success": False, "error": "Falta user_id autenticado."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 1) Verificar que el mensaje exista y quién es el autor
    cursor.execute("SELECT user_id FROM mensajes WHERE id = %s", (mensaje_id,))
    row = cursor.fetchone()
    if not row:
        cursor.close(); conn.close()
        return jsonify({"success": False, "error": "Mensaje no encontrado."}), 404

    # 2) Validar autor
    if int(row['user_id']) != int(requester_id):
        cursor.close(); conn.close()
        return jsonify({"success": False, "error": "No puedes borrar el mensaje; tú no lo escribiste."}), 403

    # 3) Borrar
    cursor.execute("DELETE FROM mensajes WHERE id = %s", (mensaje_id,))
    conn.commit()
    cursor.close(); conn.close()

    # 4) Avisar en tiempo real a los demás clientes
    socketio.emit('mensaje_eliminado', {"id": mensaje_id})

    return jsonify({"success": True, "mensaje": f"Mensaje {mensaje_id} eliminado"})


# BORRAR TODOS LOS MENSAJES
@app.route('/mensajes', methods=['DELETE'])
def delete_all_mensajes():
    data = request.get_json(silent=True) or {}
    requester_id = data.get('user_id')

    # Solo el admin (id = 1) puede borrar todo
    if requester_id == 1:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM mensajes")  # elimina todos los registros
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True, "mensaje": "Todos los mensajes fueron eliminados correctamente"})
    else:
        return jsonify({"success": False, "error": "No tienes permisos, solo el admin puede borrar todos los mensajes"}), 403

# 💬 PÁGINA DEL CHAT
@app.route('/chat')
def chat():
    return render_template('chat.html')


# 🚀 INICIO DEL SERVIDOR
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)

