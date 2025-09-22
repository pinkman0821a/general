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