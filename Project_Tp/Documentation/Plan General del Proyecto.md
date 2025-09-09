# Project_Tp - Resumen de avances y ejecución

## 🟢 Funcionalidades completadas

### 1. Diseñar y crear la base de datos
- Tablas **usuarios** y **mensajes** creadas.
- Relaciones definidas correctamente.

### 2. Implementar login funcional
- Endpoints para login implementados.
- Interfaz en HTML/CSS/JS.
- Pruebas realizadas en **Postman** y desde el navegador.

### 3. Endpoints de mensajes
- `GET /mensajes`
- `GET /mensajes/<int:user_id>`
- `POST /mensajes`
- `DELETE /mensajes/<int:mensaje_id>`
- Todos probados en **Postman**.

---

## 🟡 Funcionalidades pendientes / en progreso

### 1. Conectar mensajes con frontend
- Mostrar mensajes en la web.
- Formulario para enviar mensajes.
- Botón para eliminar mensajes.

### 2. Autenticación/Autorización avanzada
- Proteger endpoints con token o sesión.
- Restringir que cada usuario solo vea sus propios mensajes.

### 3. Diseño frontend mejorado
- UI/UX (CSS avanzado y responsive).

### 4. Pruebas finales y despliegue
- Test unitarios y de integración.
- Configurar servidor para producción (Docker / Flask + Nginx).

---

## 💻 Ejecutar Flask en segundo plano

Si quieres que tu aplicación siga corriendo aunque cierres la terminal, puedes usar `nohup`:

```bash
cd /var/www/html/
nohup python3 app.py > app.log 2>&1 &
