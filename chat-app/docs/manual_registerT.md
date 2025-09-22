# Manual de Registro de Usuario

1️⃣ Crear el modelo de usuario (models.py)

Aunque ya tienes la tabla en MySQL, en Python necesitamos un modelo/abstracción que represente esa tabla.
Si lo manejas con mysql.connector directamente (no con ORM), el modelo será más “manual”: funciones para insertar y consultar usuarios.

👉 Archivo: backend/models.py

- Función create_user(username, password_hash) → inserta en DB.
- Función get_user_by_username(username) → consulta si existe ese usuario.

2️⃣ Validaciones y seguridad (utils/auth.py)

Aquí definimos:

- hash_password(password) → usar bcrypt para guardar la contraseña encriptada.
- check_password(password, password_hash) → verificar login más adelante.
- validate_registration(username, password) → verificar que cumpla reglas (longitud mínima, caracteres válidos, etc.).

3️⃣ Crear la ruta para registro (routes/auth_routes.py)

Aquí va la lógica del endpoint:

- Recibir JSON → { "username": "juan", "password": "..." }.
- Validar datos (que no esté vacío, longitud, etc.).
- Revisar si existe el usuario (get_user_by_username).
- Si existe → retornar error 409 Conflict.
- Hashear la contraseña.
- Guardar en DB con create_user(...).
- Retornar 201 Created con mensaje "Usuario registrado con éxito".

4️⃣ Pruebas (tests/test_register.py)

Un script de prueba que haga un POST /register y verifique:

- Registro correcto → 201.
- Intentar registrar el mismo usuario → 409.
- Contraseña vacía o inválida → 400.

📌 En resumen, ya con tu config.py y la tabla lista, el flujo es:

models.py → funciones DB (create_user, get_user_by_username).

utils/auth.py → validación + bcrypt para hash.

routes/auth_routes.py → endpoint /register que conecta validaciones + modelo.

tests/test_register.py → probar todo el flujo.


{
  "username": "juan",
  "password": "Seguro123$"
}