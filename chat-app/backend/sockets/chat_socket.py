from ..models import get_user_halls,create_message,get_message_by_id
from flask_socketio import emit, join_room
from . import socketio  # asegúrate de importar la instancia global

@socketio.on('get_user_halls')
def handle_get_user_halls(data):
    user_id = data.get('user_id')
    halls = get_user_halls(user_id)
    emit('user_halls', halls)

@socketio.on('join_hall')
def handle_join_hall(data):
    hall_id = data.get('hall_id')
    # Unir al usuario al room correspondiente
    join_room(hall_id)
    # Avisar a todos en esa sala
    emit('status', {'msg': f'Un usuario entró al hall {hall_id}.'}, room=hall_id)

@socketio.on('send_message')
def handle_send_message(data):
    sender_id = data.get('sender_id')
    hall_id = data.get('hall_id')
    content = data.get('content')

    # Guardar mensaje → que devuelva el ID
    message_id = create_message(sender_id, hall_id, content)

    if message_id:
        # Recuperar con username y fecha
        message = get_message_by_id(message_id)  # misma estructura que get_messages_by_hall

        # Serializar fecha
        if message.get("created_at"):
            message["created_at"] = message["created_at"].strftime("%Y-%m-%d %H:%M:%S")

        emit('new_message', message, room=hall_id)
    else:
        emit('error', {'msg': 'Error al crear el mensaje'})

