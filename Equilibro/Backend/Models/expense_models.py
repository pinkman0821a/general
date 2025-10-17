from ..Config import get_db_connection

def createCategory(name, user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Categoria (Nombre, UsuarioId) VALUES (%s, %s)", (name, user_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creating category: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def getCategoriesByUser(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM Categoria WHERE UsuarioId = %s", (user_id,))
        categories = cursor.fetchall()
        return categories
    except Exception as e:
        print(f"Error getting categories: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def createExpense(value, description, account_id, category_id, user_id, balance):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Gasto (Valor, Descripcion, CuentaId, CategoriaId, UsuarioId) VALUES (%s, %s, %s, %s, %s)", (value, description, account_id, category_id, user_id))
        cursor.execute("UPDATE Cuenta SET SaldoActual = %s WHERE IdCuenta = %s", (balance, account_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creating expense: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def getExpensesByUser(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                g.Valor, 
                g.FechaGasto, 
                g.Descripcion, 
                c.Nombre AS NombreCuenta, 
                ca.Nombre AS NombreCategoria
            FROM Gasto AS g
            INNER JOIN Cuenta AS c ON g.CuentaId = c.IdCuenta
            INNER JOIN Categoria AS ca ON g.CategoriaId = ca.IdCategoria
            WHERE 
                g.UsuarioId = %s
                AND MONTH(g.FechaGasto) = MONTH(CURRENT_DATE())
                AND YEAR(g.FechaGasto) = YEAR(CURRENT_DATE())
        """, (user_id,))
        expenses = cursor.fetchall()
        return expenses
    except Exception as e:
        print(f"Error getting expenses: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def getMonthlyExpenses(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT 
                IFNULL(SUM(Valor), 0) AS TotalGastos
            FROM 
                Gasto
            WHERE 
                UsuarioId = %s
                AND MONTH(FechaGasto) = MONTH(CURRENT_DATE())
                AND YEAR(FechaGasto) = YEAR(CURRENT_DATE());
        """
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        return result[0] if result else 0  # Return 0 if no expenses
    except Exception as e:
        print(f"Error in getMonthlyExpenses: {e}")
        return None
    finally:
        cursor.close()
        conn.close()
        
def getExpensesByMonthAndYear(user_id, month, year):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT 
                IFNULL(SUM(Valor), 0) AS TotalGastos
            FROM 
                Gasto
            WHERE 
                UsuarioId = %s
                AND MONTH(FechaGasto) = %s
                AND YEAR(FechaGasto) = %s;
        """
        cursor.execute(query, (user_id, month, year))
        result = cursor.fetchone()
        return result[0] if result else 0  # Return 0 if no expenses
    except Exception as e:
        print(f"Error getting expenses by month and year: {e}")
        return None
    finally:
        cursor.close()
        conn.close()
        
def getExpensesDetailsByMonthAndYear(user_id, month, year):
    conn = get_db_connection()
    cursor = conn.cursor()
    try: 
        query = """
            SELECT
                g.Descripcion,
                g.Valor,
                c.Nombre AS NombreCuenta,
                ca.Nombre AS NombreCategoria,
                g.FechaGasto
            FROM
                Gasto AS g
                INNER JOIN Cuenta AS c ON g.CuentaId = c.IdCuenta
                INNER JOIN Categoria AS ca ON g.CategoriaId = ca.IdCategoria
            WHERE
                g.UsuarioId = %s
                AND MONTH(g.FechaGasto) = %s
                AND YEAR(g.FechaGasto) = %s;
        """
        cursor.execute(query, (user_id, month, year))
        result = cursor.fetchall()
        return result if result else []  # Return empty list if no expenses
    except Exception as e:
        print(f"Error getting expenses details by month and year: {e}")
        return None
    finally:
        cursor.close()
        conn.close()