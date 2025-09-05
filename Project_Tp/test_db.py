from db import get_db_connection

try:
    conn = get_db_connection()
    print("✅ Conexión a la BD exitosa!")
    conn.close()
except Exception as e:
    print("❌ Error:", e)
