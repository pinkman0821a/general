# 📘 Manual paso a paso: Control de usuarios conectados (lista visible en la interfaz)

## 1️⃣ Preparar la base de datos

* Asegúrate de que la tabla `users` tenga un campo `last_seen` de tipo **TIMESTAMP NULL**.
* Este campo guardará la última vez que el usuario estuvo activo en la aplicación.

## 2️⃣ Actualización periódica del estado del usuario

* El **frontend** (navegador) debe enviar un “ping” al backend cada cierto intervalo (ejemplo: cada 1 minuto).
* El **backend** recibe ese “ping” y actualiza el campo `last_seen` del usuario en la base de datos con la hora actual.
* Así, cada usuario tendrá registrado en la base el último momento en que estuvo activo.

## 3️⃣ Definir criterio para “usuario conectado”

* Se considera que un usuario está **en línea** si su `last_seen` es reciente.
* Por ejemplo: si la última actualización fue en los últimos **2 minutos**, se muestra como conectado.
* Si no hay actualización en ese rango, se considera desconectado.

## 4️⃣ Endpoint de usuarios conectados

* El backend expone un endpoint que devuelve la lista de usuarios que cumplen la condición de estar activos.
* Este endpoint filtra los usuarios en base al campo `last_seen`.
* La respuesta será usada por el frontend para mostrar la lista visible.

## 5️⃣ Interfaz (frontend)

* En la página del chat debe haber una sección **“Usuarios conectados”**.
* El frontend consulta al backend cada cierto tiempo (ejemplo: cada 30 segundos) para obtener la lista actualizada.
* La lista se muestra dinámicamente en la interfaz (por ejemplo, como un listado con nombres).

## 6️⃣ Flujo completo

1. Usuario inicia sesión con autenticación segura (ya tienes eso implementado con JWT).
2. El frontend guarda el token y lo usa en cada petición.
3. Cada minuto → el frontend envía “ping” → backend actualiza `last_seen`.
4. Cada 30 segundos → el frontend pide lista de usuarios conectados → backend devuelve los que tienen `last_seen` reciente.
5. El frontend muestra esa lista en pantalla.

## 7️⃣ Seguridad y buenas prácticas

* Solo usuarios autenticados pueden enviar “ping” o consultar la lista de conectados.
* Ajustar el intervalo de consulta para no sobrecargar el servidor (1 min para ping, 30s para lista es razonable).
* Usar HTTPS y validar siempre el token.
* Si quieres más precisión y menos consultas → se puede migrar después a **WebSockets**.

📂 **Resumen de archivos**

    ```
    backend/
    ├── models.py             # Funciones para actualizar last_seen y consultar usuarios activos
    ├── routes/chat_routes.py # Rutas /ping y /online-users
    └── utils/auth.py         # Verificación del JWT

    frontend/
    ├── chat.html             # Sección de usuarios conectados
    └── static/js/chat.js     # Lógica de ping y carga de la lista
    ```

¿Quieres que te arme también el **diagrama del flujo en mermaid** para visualizar mejor cómo se conectan estos pasos?
