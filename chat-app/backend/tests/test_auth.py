from backend.config import get_db_connection

try:
    conn = get_db_connection()
    print("Conexión exitosa a la base de datos.")
    conn.close()
except Exception as err:
    print(f"Error al conectar a la base de datos: {err}")
