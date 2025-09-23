from ..models import get_user_halls
from flask_socketio import emit
from . import socketio  # asegúrate de importar la instancia global

@socketio.on('get_user_halls')
def handle_get_user_halls(data):
    user_id = data.get('user_id')
    halls = get_user_halls(user_id)
    emit('user_halls', halls)
