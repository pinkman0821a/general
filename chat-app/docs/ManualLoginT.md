# Manual paso a paso: Inicio de sesión con autenticación segura

## 1️⃣ Validar datos de entrada

* Recibir JSON con `username` y `password`.
* Verificar que ambos campos no estén vacíos.
* Si falta alguno → retornar error **400 Bad Request**.

---

## 2️⃣ Consultar usuario en la base de datos

* Usar la función que ya creaste (`get_user_by_username`) para buscar si el usuario existe.
* Si no existe → retornar **401 Unauthorized** con mensaje genérico (“usuario o contraseña incorrectos”).

---

## 3️⃣ Verificar contraseña

* Usar la función `check_password` que compara la contraseña ingresada con el hash almacenado en la base de datos.
* Si no coincide → retornar **401 Unauthorized** con mensaje genérico.

---

## 4️⃣ Generar token de sesión seguro (JWT)

* Crear un **JWT** que contenga al menos:

  * `sub` → id del usuario
  * `iat` → fecha de emisión
  * `exp` → fecha de expiración (p. ej., 1 hora)
* Firmar el token con una **clave secreta** segura guardada en variables de entorno.

---

## 5️⃣ Retornar respuesta al usuario

* Código **200 OK** si login exitoso.
* Incluir en la respuesta:

  * El token JWT
  * Datos básicos del usuario (id, username, etc.)
* Opcional: guardar token en **cookie HttpOnly** o devolver en JSON para el frontend.

---

## 6️⃣ Seguridad adicional

* Nunca mostrar si el usuario existe o no en el mensaje de error (evitar enumeración de usuarios).
* Usar HTTPS siempre.
* Limitar intentos de login (rate limiting).
* Considerar refresh tokens si la sesión va a durar mucho tiempo.

---

## 7️⃣ Pruebas que debes cubrir

* Login correcto → debe devolver **200 OK** con token.
* Usuario no existe → **401 Unauthorized**.
* Contraseña incorrecta → **401 Unauthorized**.
* Campos vacíos → **400 Bad Request**.

---

## 8️⃣ Resumen de archivos y responsabilidades

```
backend/
 ├── models.py              # get_user_by_username
 ├── utils/auth.py          # check_password, create_jwt
 └── routes/auth_routes.py  # endpoint /login
tests/
 └── test_login.py          # pruebas del login
```

---

Si quieres, parcero, puedo hacerte **el siguiente manual paso a paso para proteger rutas privadas usando JWT** para que tu chat solo pueda ser usado por usuarios logueados.
¿Quieres que haga eso ahora?
