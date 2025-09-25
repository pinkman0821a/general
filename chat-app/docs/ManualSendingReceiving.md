# 📘 Manual paso a paso: Chat en salas (halls) con mensajes en tiempo real

## 1️⃣ Base de datos

- Además de tus tablas halls y user_halls, necesitas una tabla de mensajes:

- Cada mensaje pertenece a una sala (hall_id).

- Cada mensaje tiene un usuario remitente (sender_id).

- Campos básicos: id, hall_id, sender_id, content, created_at.

## 2️⃣ Lógica en el backend (models.py)

- Crear funciones para trabajar con los mensajes:

- create_message(sender_id, hall_id, content) → inserta un nuevo mensaje.

- get_messages_by_hall(hall_id) → devuelve el historial de mensajes de una sala.

- Así se separa la lógica de la BD del resto del sistema.

## 3️⃣ WebSockets (sockets/chat_socket.py)

- Eventos principales con Flask-SocketIO:

- join_hall → el usuario se conecta a una sala específica.

- send_message → guarda el mensaje en BD y lo emite a todos los que estén en esa sala.

- new_message → lo reciben en tiempo real todos los sockets conectados en ese hall_id.

👉 No usamos receiver_id, porque los receptores son todos los miembros de la sala.

## 4️⃣ Endpoints REST (routes/chat_routes.py)

- Sirven como respaldo (para historial y gestión básica):

- GET /chat/messages/<hall_id> → devuelve los mensajes de la sala.

- GET /chat/halls → listar las salas disponibles del usuario.

- POST /chat/halls/join → unirse a una sala (si quieres manejarlo vía HTTP además del socket).

## 5️⃣ Interfaz en el frontend

📄 chat.html

- Sidebar: lista de salas (halls).

- Chat area: historial de mensajes + input de texto + botón “Enviar”.

📄 chat.js

- Conexión con Socket.IO (const socket = io();).

- Seleccionar sala: carga historial (fetch /chat/messages/<hall_id>) y entra al socket con join_hall.

- Enviar mensajes: al hacer click en el botón o presionar Enter.

- Recibir mensajes: escucha new_message y lo pinta en el chat en tiempo real.

- Auto-scroll: baja siempre al último mensaje.

- Formato de fecha: diferencia entre mensajes de hoy y de días anteriores.

## 6️⃣ Flujo de uso

- Usuario entra al sistema (ya está autenticado y conectado).

- Elige una sala en el sidebar.

- El frontend:

- Llama a /chat/messages/<hall_id> para traer historial.

- Se une a la sala con join_hall.

- Cuando escribe un mensaje:

- Se emite send_message al backend.

- Backend lo guarda en BD.

- Backend emite new_message a todos los usuarios en esa sala.

- Todos los que están conectados en esa sala lo ven inmediatamente.

## 7️⃣ Buenas prácticas

- Validar siempre que el usuario pertenece a la sala (user_halls) antes de dejarlo enviar mensajes.

- Evitar que un usuario se conecte a salas que no le corresponden.

- Manejar paginación o límite en /messages (por ejemplo últimos 50 mensajes).

- Usar JOIN con la tabla de users para mostrar username en vez de solo sender_id.

📂 Estructura actual de archivos

  ```plaintext
  backend/
  ├── models.py               # create_message, get_messages_by_hall, get_message_by_id, consultas halls
  ├── sockets/chat_socket.py  # join_hall, send_message -> emit new_message
  └── routes/chat_routes.py   # /chat/messages/<hall_id>, /chat/halls

  frontend/
  ├── chat.html
  └── static/js/
      ├── utils.js
      ├── messages.js
      ├── halls.js
      ├── users.js
      └── chat.js
  ```
