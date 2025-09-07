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

## 💻 Ejecutar Flask en segundo plano

Si quieres que tu aplicación siga corriendo aunque cierres la terminal, puedes usar `nohup`:

```bash
cd /var/www/html/
nohup python3 app.py > app.log 2>&1 &
```

**Explicación:**
- `nohup` → evita que el proceso se detenga al cerrar la sesión.
- `> app.log 2>&1` → redirige toda la salida a `app.log`.
- `&` → ejecuta el proceso en segundo plano.

Para **ver los logs** en tiempo real:

```bash
tail -f app.log
```

Para **detener el proceso**:
1. Buscar el PID del proceso:
```bash
ps aux | grep app.py
```
2. Detenerlo:
```bash
kill <PID>
```

> ⚠️ Tip profesional: también se puede configurar con `systemd` para que Flask corra como un servicio y arranque automáticamente al iniciar el servidor.


clonar git

instalar git
sudo apt update
sudo apt install git -y

git clone https://github.com/pinkman0821a/general.git


cd ~/general/Project_Tp

sudo cp -r . /var/www/html/

sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html


## ✍️ Autor
Juan Manuel Gonzalez
