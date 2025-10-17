from ..Config import get_db_connection

def createAccount(name, balance, user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Cuenta (Nombre, SaldoInicial, SaldoActual, UsuarioId) VALUES (%s, %s, %s, %s)", (name, balance, balance, user_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creating account: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def getAccountsByUser(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM Cuenta WHERE UsuarioId = %s", (user_id,))
        accounts = cursor.fetchall()
        return accounts
    except Exception as e:
        print(f"Error getting accounts: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def getAccountById(account_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT SaldoActual FROM Cuenta WHERE IdCuenta = %s", (account_id,))
        account = cursor.fetchone()
        return account
    except Exception as e:
        print(f"Error getting account by ID: {e}")
        return None
    finally:
        cursor.close()
        conn.close()
        
def getMovementsByUser(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                m.Valor, 
                m.FechaMovimiento, 
                m.Tipo, 
                c.Nombre AS NombreCuenta, 
                m.UsuarioId
            FROM Movimiento AS m
            INNER JOIN Cuenta AS c ON m.CuentaId = c.IdCuenta
            WHERE 
                m.UsuarioId = %s
                AND MONTH(m.FechaMovimiento) = MONTH(CURRENT_DATE())
                AND YEAR(m.FechaMovimiento) = YEAR(CURRENT_DATE())
        """, (user_id,))
        movements = cursor.fetchall()
        return movements
    except Exception as e:
        print(f"Error getting movements: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def getIncomesByUser(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                i.Valor, 
                i.FechaIngreso, 
                c.Nombre AS NombreCuenta, 
                i.UsuarioId
            FROM Ingreso AS i
            INNER JOIN Cuenta AS c ON i.CuentaId = c.IdCuenta
            WHERE 
                i.UsuarioId = %s
                AND MONTH(i.FechaIngreso) = MONTH(CURRENT_DATE())
                AND YEAR(i.FechaIngreso) = YEAR(CURRENT_DATE())
        """, (user_id,))
        incomes = cursor.fetchall()
        return incomes
    except Exception as e:
        print(f"Error getting incomes: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def makeMovement(account_id_a, value_a, account_id_b, value_b):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Cuenta SET SaldoActual = %s WHERE IdCuenta = %s", (value_a, account_id_a))
        cursor.execute("UPDATE Cuenta SET SaldoActual = %s WHERE IdCuenta = %s", (value_b, account_id_b))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error making movement: {e}")
        return False
    finally:
        cursor.close()
        conn.close()       
        
def createMovement(user_id, amount, account_id_a, account_id_b):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO Movimiento (Valor, Tipo, CuentaId, UsuarioId) VALUES (%s, 'SALE', %s, %s)",
            (amount, account_id_a, user_id)
        )
        cursor.execute(
            "INSERT INTO Movimiento (Valor, Tipo, CuentaId, UsuarioId) VALUES (%s, 'ENTRA', %s, %s)",
            (amount, account_id_b, user_id)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creating movement: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()        
        
def createIncome(user_id, amount, account_id, balance):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Ingreso (Valor, CuentaId, UsuarioId) VALUES (%s, %s, %s)", (amount, account_id, user_id))
        cursor.execute("UPDATE Cuenta SET SaldoActual = %s WHERE IdCuenta = %s", (balance, account_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creating income: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def getAccountsByUserId(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT SaldoActual FROM Cuenta WHERE UsuarioId = %s", (user_id,))
        accounts = cursor.fetchall()
        total = sum(account[0] for account in accounts) if accounts else 0
        return total
    except Exception as e:
        print(f"Error getting accounts by user ID: {e}")
        return None
    finally:
        cursor.close()
        conn.close()        
        
