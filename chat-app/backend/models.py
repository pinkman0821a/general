from .config import get_db_connection # Import the database connection function from config.py

# Create a new user in the database
def create_user(username, password_hash):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, password_hash))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creating user: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
# Fetch user by username in the database
def get_user_by_username(username):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        return cursor.fetchone()
    except Exception as e:
        print(f"Error fetching user: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

# Update the last seen timestamp for a user
def last_seen(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET last_seen = NOW() WHERE id = %s", (user_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating last seen: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
# Fetch users who have been active in the last 2 minutes
def onlineUsers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, username, last_seen FROM users WHERE last_seen >= NOW() - INTERVAL 2 MINUTE")
        return cursor.fetchall()
    except Exception as e:
        print(f"Error fetching online users: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
   
def create_hall(hall_name):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO halls (name) VALUES (%s)", (hall_name,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creating hall: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def add_user_to_hall(user_id, hall_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO user_halls (user_id, hall_id) VALUES (%s, %s)", (user_id, hall_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error adding user to hall: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def create_message(sender_id, hall_id, content):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO messages (sender_id, hall_id, content, created_at) VALUES (%s, %s, %s, NOW())",
            (sender_id, hall_id, content)
        )
        conn.commit()
        return cursor.lastrowid  # devolvemos el ID del mensaje insertado
    except Exception as e:
        print(f"Error creating message: {e}")
        return None
    finally:
        cursor.close()
        conn.close()
        
def create_message(sender_id, hall_id, content):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO messages (sender_id, hall_id, content, created_at) VALUES (%s, %s, %s, NOW())",
            (sender_id, hall_id, content)
        )
        conn.commit()
        return cursor.lastrowid  # devolvemos el ID del mensaje insertado
    except Exception as e:
        print(f"Error creating message: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def get_message_by_id(message_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT m.id, m.sender_id, u.username, m.hall_id, m.content, m.created_at
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = %s
        """, (message_id,))
        return cursor.fetchone()
    except Exception as e:
        print(f"Error fetching message by id: {e}")
        return None
    finally:
        cursor.close()
        conn.close()
      
def get_messages_by_hall(hall_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT m.id, m.sender_id, u.username, m.hall_id, m.content, m.created_at, m.deleted
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.hall_id = %s
            ORDER BY m.created_at ASC
        """, (hall_id,))
        return cursor.fetchall()
    except Exception as e:
        print(f"Error fetching messages: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def get_user_halls(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT h.id, h.name
            FROM halls h
            JOIN user_halls uh ON h.id = uh.hall_id
            WHERE uh.user_id = %s
        """, (user_id,))
        return cursor.fetchall()
    except Exception as e:
        print(f"Error fetching user halls: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def delete_message(message_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE messages SET deleted = TRUE WHERE id = %s", (message_id,))
        conn.commit()

        # rowcount = cuántas filas fueron afectadas
        if cursor.rowcount == 0:
            return False   # no se encontró el mensaje
        return True        # se marcó como eliminado
    except Exception as e:
        print(f"Error deleting message: {e}")
        return None        # error de base de datos
    finally:
        cursor.close()
        conn.close()
        
def get_hall_info(hall_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                h.name AS hall_name,
                h.created_at AS hall_created_at,
                GROUP_CONCAT(u.username ORDER BY u.username SEPARATOR ', ') AS users
            FROM user_halls uh
            JOIN users u ON u.id = uh.user_id
            JOIN halls h ON h.id = uh.hall_id
            WHERE h.id = %s
            GROUP BY h.id, h.name, h.created_at;
        """, (hall_id,))
        return cursor.fetchall()
    except Exception as e:
        print(f"Error fetching information hall: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def add_user_to_hall_name(sender_id, hall_name):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM halls WHERE name = %s", (hall_name,))
        hall = cursor.fetchone()
        if hall:
            hall_id = hall[0]  # Extraer el ID de la tupla
            return add_user_to_hall(sender_id, hall_id)
        else:
            print(f"Hall '{hall_name}' no encontrado.")
            return False
    except Exception as e:
        print(f"Error adding user to hall: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def fetch_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, username FROM users;")
        return cursor.fetchall()
    except Exception as e:
        print(f"Error fetching users: {e}")
        return []
    finally:
        cursor.close()
        conn.close()