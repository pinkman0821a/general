# Entorno virtual de Python

## 🚀 Configuración del entorno virtual

1. **Ve a la ubicación del proyecto**

    ```powershell
    cd C:\Users\Admin\Documents\GitHub\general\Project_Tp
    ```

2. **Crea el entorno virtual con venv**

    ```powershell
    python -m venv venv

- Esto te crea una carpeta llamada venv dentro de tu proyecto, donde quedarán todas las librerías que instales.

3. **Activa el entorno virtual**

    ```powershell
    .\venv\Scripts\Activate
    ```

- Cuando se active, vas a ver algo así al inicio de la línea de tu consola:

    ```powershell
    (venv) C:\Users\TuUsuario\proyecto>

## 🛠 Instalación de dependencias

### mysql

1. **Instala el conector de MySQL en el entorno**

    ```powershell
    pip install mysql-connector-python
2. **Verifica que se instaló correctamente**

    ```powershell
    pip list

- Ejemplo de salida:

    ```powershell
    mysql-connector-python 9.4.0

### flask

1. **instala Flask dentro del entorno virtual:**

    ```powershell
    pip install flask 
2. **Verifica que se instaló correctamente**

    ```powershell
    pip list

- Ejemplo de salida:

    ```powershell
    Flask                  3.1.2

### flask-socketio

1. **instala Flask dentro del entorno virtual:**

    ```powershell
    pip install flask-socketio
2. **Verifica que se instaló correctamente**

    ```powershell
    pip list

- Ejemplo de salida:

    ```powershell
    Flask-SocketIO         5.5.1 

## ✅ Verificación de la conexión a la base de datos

1. **Ejecuta el proyecto de prueba (test_db.py)**

    ```powershell
    python test_db.py
2. **Si la conexión es exitosa, deberías ver el mensaje:**

    ```powershell
    ✅ Conexión a la BD exitosa!
3. **Luego podrás correr el proyecto principal (app.py):**

    ```powershell
    python app.py

- Ejemplo de salida:

    ```powershell
    * Serving Flask app 'app'
    * Debug mode: off
    WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
    * Running on all addresses (0.0.0.0)
    * Running on http://127.0.0.1:5000
    * Running on http://192.168.0.18:5000
    Press CTRL+C to quit 









## 📌 Notas

- Asegúrate de tener instalado Python 3.10+.

- El archivo test_db.py está pensado solo para verificar la conexión con la base de datos.

- El archivo principal del proyecto es app.py.

## ✍️ Autor: Juan Manuel Gonzalez
