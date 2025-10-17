from ..Config import get_db_connection

def createUser(name, email, password):
    currency_id = 1  # Assign default currency ID, for example, 1 for USD
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Usuario (Nombre, Correo, Contrasena, MonedaId) VALUES (%s, %s, %s, %s)", (name, email, password, currency_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creating user: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def getUserByEmail(email):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM Usuario WHERE Correo = %s", (email,))
        user = cursor.fetchone()
        return user
    except Exception as e:
        print(f"Error getting user: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def updateUserForm(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Usuario SET Formulario = TRUE WHERE IdUsuario = %s", (user_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating user form: {e}")
        return False
    finally:
        cursor.close()
        conn.close()