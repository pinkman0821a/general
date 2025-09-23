from flask_socketio import SocketIO

# Crear una instancia global de SocketIO
socketio = SocketIO(cors_allowed_origins="*")  # Permitir CORS para pruebas con frontend separado