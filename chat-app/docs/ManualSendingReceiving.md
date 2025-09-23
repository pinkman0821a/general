# 📘 Manual paso a paso: Envío y recepción de mensajes instantáneos en salas (halls)

## 1️⃣ Preparar la base de datos

* Además de tus tablas `halls` y `user_halls`, necesitas una tabla para mensajes:

👉 Cada mensaje pertenece a una **sala (`hall_id`)** y a un **usuario que lo envía (`sender_id`)**.

---

## 2️⃣ Modelo de mensajes

* En `models.py`, crear funciones para:

  * Guardar un nuevo mensaje en una sala.
  * Consultar los últimos mensajes de una sala (para historial al entrar).

---

## 3️⃣ Conexión en tiempo real (WebSockets)

* Flujo con **Flask-SocketIO**:

  * Al conectarse, el usuario se **une a las salas** donde está registrado (`user_halls`).
  * Cuando envía un mensaje → se guarda en BD → se emite el mensaje a todos los usuarios de esa sala.
  * Los que están en la misma sala lo reciben en tiempo real.

👉 Aquí no hay `receiver_id` porque todos los miembros de la sala son receptores.

---

## 4️⃣ Endpoints REST de respaldo

* Para historial de mensajes:

  * `/halls/<hall_id>/messages` → devuelve los mensajes de esa sala.
* Para manejar salas:

  * `/halls` → listar salas.
  * `/halls/join` → unirse a una sala.

---

## 5️⃣ Interfaz (frontend)

* En `chat.html`:

  * Lista de salas disponibles.
  * Área de mensajes de la sala seleccionada.
  * Input para escribir y botón para enviar.

* En `chat.js`:

  * Al seleccionar una sala → cargar historial con `fetch`.
  * Conectarse a esa sala por WebSocket.
  * Escuchar evento `new_message` para mostrar mensajes nuevos.
  * Emitir `send_message` con el contenido del input.

---

## 6️⃣ Flujo completo

1. Usuario inicia sesión con JWT.
2. Elige una sala (hall).
3. Frontend pide historial de `/halls/<hall_id>/messages`.
4. Cuando envía un mensaje:

   * `chat.js` emite `send_message` con `hall_id + content`.
   * Backend guarda el mensaje en BD.
   * Backend emite `new_message` a todos los sockets conectados en esa sala.
5. Todos los miembros de la sala ven el mensaje en tiempo real.

---

## 7️⃣ Seguridad y buenas prácticas

* Validar que el usuario **realmente pertenece a la sala** antes de permitir enviar mensajes.
* No permitir que un usuario escriba en un `hall_id` en el que no está registrado (`user_halls`).
* Implementar paginación en historial de mensajes (no cargar todos de una).
* Usar `JOIN` con `users` para mostrar nombre/username del remitente en cada mensaje.

---

📂 **Resumen de archivos**

```
backend/
├── models.py               # Modelo Message + consultas de halls
├── sockets/chat_socket.py  # Eventos send_message / new_message en salas
└── routes/chat_routes.py   # Endpoints /halls y /messages

frontend/
├── chat.html               # Lista de salas + área de chat
└── static/js/chat.js       # Conexión socket, envío y recepción en salas
```

---

¿Querés que te arme el **manual paso a paso versión “con salas”** en formato igualito al que hicimos para *usuarios conectados* (todo en viñetas y numerado), para que quede consistente con tu documentación?
