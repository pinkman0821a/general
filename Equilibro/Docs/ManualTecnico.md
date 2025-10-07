# Manual Técnico

## Instalacion de mysql en el servidor

1. Actualizamos el servidor:

    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

2. Instalamos MySQL:

    ```bash
    sudo apt install mysql-server -y
    ```

3. Iniciamos el servicio:

    ```bash
    sudo systemctl start mysql
    ```

4. Configuramos para que inicie cada vez que se encienda el servidor:

    ```bash
    sudo systemctl enable mysql
    ```

5. Revisamos que el servicio esté corriendo correctamente:

    ```bash
    sudo systemctl status mysql
    ```

6. Ejecutamos la configuración segura:

    ```bash
    sudo mysql_secure_installation
    ```

    - Validar plugin de contraseña (VALIDATE PASSWORD PLUGIN) — pregunta de nivel (0/1/2):
        - Recomendado: Sí (y escoger nivel 1 o 2 si quieres forzar contraseñas fuertes).
        - Por qué: evita contraseñas débiles. Si te rompe scripts, puedes no activarlo y gestionarlo después.
    - Enter current root password (si no hay, presiona Enter).
    - Set root password? — Recomendado: Sí (a menos que uses auth_socket y prefieras acceso root solo vía sudo).
        - Usa una contraseña larga/aleatoria.
    - Remove anonymous users? — Sí. Reduce vectores de ataque.
    - Disallow root login remotely? — Sí, salvo que necesites administrarlo remotamente (mejor crear otro usuario admin para acceso remoto).
    - Remove test database and access to it? — Sí. La base de datos de prueba es innecesaria en producción.
    - Reload privilege tables now? — Sí. Aplica los cambios de inmediato.

## Configuración de la base de datos

1. Nos conectamos con el usuario root:

    ```bash
    sudo mysql -u root -p
    ```

2. Creamos el usuario con el que nos vamos a conectar a la base de datos:

    ```sql
    CREATE USER 'juan'@'%' IDENTIFIED BY 'M4n24n4.,';
    ```

3. Le damos los privilegios para la conexión:

    ```sql
    GRANT ALL PRIVILEGES ON *.* TO 'juan'@'%' WITH GRANT OPTION;
    FLUSH PRIVILEGES;
    ```

4. Probamos la conexión con el nuevo usuario:

    ```bash
    mysql -h 192.168.0.37 -u juan -p
    ```

## Crear base de datos

1. crear base de datos

    ```bash
        pendiente
    ```

## Entorno virtual de Python

## 🚀 Configuración del entorno virtual

1. **Ve a la ubicación del proyecto**

    ```powershell
    cd C:\Users\Admin\Documents\GitHub\general\Equilibro
    ```

2. **Crea el entorno virtual con venv**

    ```powershell
    python -m venv venv
    ```

   - Esto te crea una carpeta llamada venv dentro de tu proyecto, donde quedarán todas las librerías que instales.

3. **Activa el entorno virtual**

    ```powershell
    .\venv\Scripts\Activate
    ```

- Cuando se active, vas a ver algo así al inicio de la línea de tu consola:

    ```powershell
    (venv) C:\Users\TuUsuario\proyecto>
    ```

## 🛠 Instalación de dependencias

### mysql

1. **Instala el conector de MySQL en el entorno**

    ```powershell
    pip install mysql-connector-python
    ```

2. **Verifica que se instaló correctamente**

    ```powershell
    pip list
    ```

- Ejemplo de salida:

    ```powershell
    mysql-connector-python 9.4.0
    ```

### flask

1. **Instala el conector de MySQL en el entorno**

    ```powershell
    pip install flask
    ```

2. **Verifica que se instaló correctamente**

    ```powershell
    pip list
    ```

- Ejemplo de salida:

    ```powershell
    Flask                  3.1.2
    ```

### pyjwt python-dotenv

1. **Instala el conector de MySQL en el entorno**

    ```powershell
    pip install pyjwt python-dotenv
    ```

2. **Verifica que se instaló correctamente**

    ```powershell
    pip list
    ```

- Ejemplo de salida:

    ```powershell
    PyJWT                  2.10.1
    python-dotenv          1.1.1
    ```

### bcrypt

1. **Instala el conector de MySQL en el entorno**

    ```powershell
    pip install bcrypt
    ```

2. **Verifica que se instaló correctamente**

    ```powershell
    pip list
    ```

- Ejemplo de salida:

    ```powershell
    bcrypt                 4.3.0
    ```

## ✅ Verificación de la conexión a la base de datos

1. **Ejecuta el proyecto de prueba (test_db.py)**

    ```powershell
    python -m Backend.Tests.TestAuth
    ```

2. **Si la conexión es exitosa, deberías ver el mensaje:**

    ```powershell
    ✅ Conexión a la BD exitosa!
    ```

3. **Luego podrás correr el proyecto principal (app.py):**

    ```powershell
    python -m backend.app
    ```

- Ejemplo de salida:

    ```powershell
    * Serving Flask app 'app'
    * Debug mode: off
    WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
    * Running on all addresses (0.0.0.0)
    * Running on http://127.0.0.1:5000
    * Running on http://192.168.0.18:5000
    Press CTRL+C to quit 
    ```

## 📌 Notas

- Asegúrate de tener instalado Python 3.10+.

- El archivo test_db.py está pensado solo para verificar la conexión con la base de datos.

- El archivo principal del proyecto es app.py.

## ✍️ Autor: Juan Manuel Gonzalez
