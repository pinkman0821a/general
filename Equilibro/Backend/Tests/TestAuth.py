from Backend.Config import get_db_connection

try:
    conn = get_db_connection()
    print("Conexión exitosa a la base de datos.")
    conn.close()
except Exception as e:
    print(f"Error al conectar a la base de datos: {e}")