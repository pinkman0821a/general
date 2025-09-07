import mysql.connector

def get_db_connection():
    conn = mysql.connector.connect(
        host="3.141.170.140",    # IP de tu servidor
        user="juan",
        password="M4n24n4.,",
        database="chat_app",
        ssl_disabled=True
    )
    return conn
