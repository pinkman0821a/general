from .Config import get_db_connection

def CrearUsuario(nombre, correo, contraseña):
    moneda_id = 1  # Asignar un ID de moneda predeterminado, por ejemplo, 1 para USD
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Usuario (Nombre, Correo, Contrasena, MonedaId) VALUES (%s, %s, %s,%s)", (nombre, correo, contraseña,moneda_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error al crear usuario: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def ObtenerUsuarioPorCorreo(correo):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM Usuario WHERE Correo = %s", (correo,))
        usuario = cursor.fetchone()
        return usuario
    except Exception as e:
        print(f"Error al obtener usuario: {e}")
        return None
    finally:
        cursor.close()
        conn.close()