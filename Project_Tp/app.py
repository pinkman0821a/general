# Importamos las librerías necesarias
from flask import Flask, request, jsonify, render_template  
# Flask: framework web para crear aplicaciones HTTP
# request: para obtener datos que vienen del cliente (POST, GET, etc.)
# jsonify: para devolver respuestas en JSON
# render_template: para renderizar archivos HTML

from flask_socketio import SocketIO, emit
# Flask-SocketIO: permite comunicación en tiempo real (WebSockets)
# emit: envía eventos a los clientes conectados

from db import get_db_connection  
# Importamos la función que conecta con la base de datos MySQL

from datetime import datetime  
# Para manejar fechas y horas

import mysql.connector  
# Para interactuar con MySQL (aunque en tu código usamos get_db_connection)

 # Inicializamos la aplicación Flask
app = Flask(__name__)  

# Inicializamos SocketIO y permitimos CORS desde cualquier origen
socketio = SocketIO(app, cors_allowed_origins="*")

#🔑 LOGIN
# Ruta POST /login para iniciar sesión
@app.route('/login', methods=['POST'])
def login():
    data = request.json  # Obtenemos los datos enviados en formato JSON
    username = data['username']  # Nombre de usuario recibido
    password = data['password']  # Contraseña recibida

    conn = get_db_connection()  # Abrimos conexión a la base de datos
    cursor = conn.cursor(dictionary=True)  # Creamos un cursor que devuelve diccionarios
    cursor.execute("SELECT * FROM usuarios WHERE username=%s", (username,))
    # Buscamos al usuario por username
    user = cursor.fetchone()  # Obtenemos el primer resultado
    cursor.close()
    conn.close()  # Cerramos la conexión

    # Verificamos si el usuario existe y la contraseña coincide
    if user and password == user['password_hash']:
        return jsonify({"success": True, "user_id": user['id']})  
        # Retornamos éxito y el id del usuario
    return jsonify({"success": False}), 401  
    # Si falla login, devolvemos 401 Unauthorized

# 🔥 PÁGINA PRINCIPAL
@app.route('/')
def index():
    return render_template('login.html')  
    # Renderiza el HTML de login

# 💬 PÁGINA DEL CHAT
@app.route('/chat')
def chat():
    return render_template('chat.html')  
    # Renderiza la página de chat

# 🔥 SOCKET.IO MENSAJES
# Evento de SocketIO para recibir mensajes en tiempo real
@socketio.on('mensaje')
def handle_message(data):
    user_id = data['user_id']  # ID del usuario que envía el mensaje
    mensaje = data['mensaje']  # Contenido del mensaje
    fecha = datetime.now().date()  # Fecha actual
    hora = datetime.now().time()   # Hora actual

    # Guardamos el mensaje en la base de datos
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO mensajes (user_id, mensaje, fecha, hora) VALUES (%s, %s, %s, %s)",
        (user_id, mensaje, fecha, hora)
    )
    mensaje_id = cursor.lastrowid  # Capturamos el ID autoincremental
    conn.commit()
    cursor.close()
    conn.close()

    data['id'] = mensaje_id  # Agregamos el id al payload que se emitirá

    socketio.emit('mensaje', data)  
    # Emitimos el mensaje a todos los clientes conectados en tiempo real

# 📩 OBTENER TODOS LOS MENSAJES
# Definimos una ruta HTTP GET para la URL /mensajes
# Esta función devuelve todos los mensajes guardados en la base de datos
@app.route('/mensajes', methods=['GET'])
def get_mensajes():
    # Abrimos una conexión a la base de datos
    conn = get_db_connection()
    # Creamos un cursor que devuelve los resultados como diccionarios
    cursor = conn.cursor(dictionary=True)
    
    # Ejecutamos una consulta SQL para obtener todos los mensajes
    # Incluimos el username del autor usando JOIN con la tabla usuarios
    # Los resultados se ordenan por fecha y hora de forma ascendente
    cursor.execute("""
        SELECT m.id, m.mensaje, m.fecha, m.hora, m.user_id, u.username
        FROM mensajes m
        JOIN usuarios u ON m.user_id = u.id
        ORDER BY m.fecha ASC, m.hora ASC
    """)  
    # Traemos todos los mensajes resultantes de la consulta
    mensajes = cursor.fetchall()  # Guardamos todos los resultados en una lista
    # Cerramos el cursor
    cursor.close()
    # Cerramos la conexión a la base de datos
    conn.close()

    # Convertimos los campos fecha y hora a strings para que sean válidos en JSON
    for m in mensajes:
        m["fecha"] = m["fecha"].strftime("%Y-%m-%d") if m["fecha"] else None
        m["hora"] = str(m["hora"]) if m["hora"] else None

    # Devolvemos los mensajes en formato JSON al cliente
    return jsonify(mensajes)

# 📩 OBTENER MENSAJES POR USUARIO
# Definimos una ruta HTTP GET para la URL /mensajes/<user_id>
# <int:user_id> indica que recibimos un número entero como parámetro en la URL
@app.route('/mensajes/<int:user_id>', methods=['GET'])
def get_mensajes_by_user(user_id):
    # Abrimos conexión a la base de datos
    conn = get_db_connection()
    # Creamos un cursor que devuelve los resultados como diccionarios (en lugar de tuplas)
    cursor = conn.cursor(dictionary=True)
    
    # Ejecutamos una consulta SQL para traer los mensajes de ese usuario
    # Se unen las tablas mensajes (m) y usuarios (u) para obtener el username del autor
    # Solo traemos los mensajes donde m.user_id coincide con el parámetro user_id
    # Se ordenan primero por fecha ASC y luego por hora ASC
    cursor.execute("""
        SELECT m.id, m.mensaje, m.fecha, m.hora, m.user_id, u.username
        FROM mensajes m
        JOIN usuarios u ON m.user_id = u.id
        WHERE m.user_id = %s
        ORDER BY m.fecha ASC, m.hora ASC
    """, (user_id,))  # Pasamos el parámetro user_id como tupla para evitar SQL Injection

    # Guardamos todos los resultados de la consulta en la variable mensajes
    mensajes = cursor.fetchall()
    # Cerramos el cursor
    cursor.close()
    # Cerramos la conexión a la base de datos
    conn.close()

    # Convertimos los campos fecha y hora a strings para poder enviarlos en JSON
    for m in mensajes:
        m["fecha"] = m["fecha"].strftime("%Y-%m-%d") if m["fecha"] else None
        m["hora"] = str(m["hora"]) if m["hora"] else None

    # Devolvemos los mensajes como un JSON
    return jsonify(mensajes)

# 🗑️ BORRAR MENSAJE ESPECÍFICO
# Definimos una ruta HTTP DELETE para la URL /mensajes/<mensaje_id>
# <int:mensaje_id> indica que recibimos un número entero como parámetro
@app.route('/mensajes/<int:mensaje_id>', methods=['DELETE'])
def delete_mensaje(mensaje_id):
    # Obtenemos los datos enviados en el body de la solicitud (JSON)
    # silent=True evita que falle si no hay JSON
    data = request.get_json(silent=True) or {}
    
    # Obtenemos el user_id del usuario que está solicitando borrar el mensaje
    requester_id = data.get('user_id')  # viene del frontend

    # Si no se recibe el user_id, devolvemos un error 400 Bad Request
    if requester_id is None:
        return jsonify({"success": False, "error": "Falta user_id autenticado."}), 400

    # Abrimos conexión a la base de datos
    conn = get_db_connection()
    # Creamos un cursor que devuelve resultados como diccionarios
    cursor = conn.cursor(dictionary=True)

    # Verificamos si el mensaje existe y obtenemos su autor
    cursor.execute("SELECT user_id FROM mensajes WHERE id = %s", (mensaje_id,))
    row = cursor.fetchone()  # obtenemos el primer resultado
    if not row:  # Si no existe el mensaje
        cursor.close(); conn.close()  # cerramos cursor y conexión
        return jsonify({"success": False, "error": "Mensaje no encontrado."}), 404  # Not Found

    # Validamos que quien quiere borrar el mensaje sea el autor
    if int(row['user_id']) != int(requester_id):
        cursor.close(); conn.close()  # cerramos cursor y conexión
        return jsonify({
            "success": False, 
            "error": "No puedes borrar el mensaje; tú no lo escribiste."
        }), 403  # Forbidden

    # Borramos el mensaje de la base de datos
    cursor.execute("DELETE FROM mensajes WHERE id = %s", (mensaje_id,))
    conn.commit()  # confirmamos los cambios
    cursor.close(); conn.close()  # cerramos cursor y conexión

    # Avisamos en tiempo real a los demás clientes conectados vía SocketIO
    socketio.emit('mensaje_eliminado', {"id": mensaje_id})

    # Retornamos un JSON indicando que el mensaje fue eliminado exitosamente
    return jsonify({"success": True, "mensaje": f"Mensaje {mensaje_id} eliminado"})

# BORRAR TODOS LOS MENSAJES (solo admin)
# Definimos una ruta HTTP DELETE para la URL /mensajes
@app.route('/mensajes', methods=['DELETE'])
def delete_all_mensajes():
    # Obtenemos los datos enviados en el body de la solicitud (JSON)
    # silent=True evita que falle si no hay JSON
    data = request.get_json(silent=True) or {}
    
    # Obtenemos el user_id del solicitante, que viene del frontend
    requester_id = data.get('user_id')

    # Verificamos si el usuario es el admin (id = 1)
    if requester_id == 1:
        # Si es admin, abrimos conexión a la base de datos
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Ejecutamos el DELETE para eliminar todos los mensajes de la tabla
        cursor.execute("DELETE FROM mensajes")
        
        # Confirmamos los cambios en la base de datos
        conn.commit()
        
        # Cerramos el cursor y la conexión
        cursor.close()
        conn.close()
        
        # Retornamos un JSON indicando que todos los mensajes fueron eliminados
        return jsonify({"success": True, "mensaje": "Todos los mensajes fueron eliminados correctamente"})
    else:
        # Si no es admin, devolvemos un error 403 Forbidden con mensaje
        return jsonify({
            "success": False,
            "error": "No tienes permisos, solo el admin puede borrar todos los mensajes"
        }), 403

# 🚀 INICIO DEL SERVIDOR
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
    # Arranca el servidor en todas las IPs disponibles (0.0.0.0) en el puerto 5000
    # allow_unsafe_werkzeug=True evita warnings en desarrollo
