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
        
def CrearCuenta(nombre,saldo,usuario_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Cuenta (Nombre, SaldoInicial, SaldoActual, UsuarioId) VALUES (%s, %s, %s, %s)", (nombre, saldo, saldo, usuario_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error al crear cuenta: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def CrearCategoria(nombre, usuario_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Categoria (Nombre, UsuarioId) VALUES (%s, %s)", (nombre, usuario_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error al crear categoria: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def ActualizarFormularioUsuario(usuario_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Usuario SET Formulario = TRUE WHERE IdUsuario = %s", (usuario_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error al actualizar formulario del usuario: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def ObtenerCuentasPorUsuario(usuario_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM Cuenta WHERE UsuarioId = %s", (usuario_id,))
        cuentas = cursor.fetchall()
        return cuentas
    except Exception as e:
        print(f"Error al obtener cuentas: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def ObtenerCategoriasPorUsuario(usuario_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM Categoria WHERE UsuarioId = %s", (usuario_id,))
        categorias = cursor.fetchall()
        return categorias
    except Exception as e:
        print(f"Error al obtener categorias: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def CrearGasto(Valor,Descripcion,CuentaId,CategoriaId,UsuarioId,saldo):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Gasto (Valor, Descripcion, CuentaId, CategoriaId, UsuarioId) VALUES (%s, %s, %s, %s, %s)", (Valor, Descripcion, CuentaId, CategoriaId, UsuarioId))
        cursor.execute("UPDATE Cuenta SET SaldoActual = %s WHERE IdCuenta = %s", (saldo, CuentaId))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error al crear gasto: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def ObtenerGastosPorUsuario(usuario_id):
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
        """, (usuario_id,))
        gastos = cursor.fetchall()
        return gastos
    except Exception as e:
        print(f"Error al obtener gastos: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def HacerMovimiento(cuentaIdA, valorA, cuentaIdB, valorB):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Cuenta SET SaldoActual = %s WHERE IdCuenta = %s", (valorA, cuentaIdA))
        cursor.execute("UPDATE Cuenta SET SaldoActual = %s WHERE IdCuenta = %s", (valorB, cuentaIdB))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error al hacer movimiento: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def ObtenerCuentaPorid(cuenta_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT SaldoActual FROM Cuenta WHERE IdCuenta = %s", (cuenta_id,))
        cuenta = cursor.fetchone()
        return cuenta
    except Exception as e:
        print(f"Error al obtener cuenta por ID: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def CrearMovimiento(usuario_id, monto, cuentaIdA, cuentaIdB):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO Movimiento (Valor, Tipo, CuentaId, UsuarioId) VALUES (%s, 'SALE', %s, %s)",
            (monto, cuentaIdA, usuario_id)
        )
        cursor.execute(
            "INSERT INTO Movimiento (Valor, Tipo, CuentaId, UsuarioId) VALUES (%s, 'ENTRA', %s, %s)",
            (monto, cuentaIdB, usuario_id)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error al crear movimiento: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def ObtenerMovimientoPorUsuario(usuario_id):
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
        """, (usuario_id,))
        movimientos = cursor.fetchall()
        return movimientos
    except Exception as e:
        print(f"Error al obtener movimiento: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def CrearIngreso(usuario_id, monto, CuentaId, saldo):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Ingreso (Valor, CuentaId, UsuarioId) VALUES (%s, %s, %s)", (monto, CuentaId, usuario_id))
        cursor.execute("UPDATE Cuenta SET SaldoActual = %s WHERE IdCuenta = %s", (saldo, CuentaId))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error al crear gasto: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        
def ObtenerIngresoPorUsuario(usuario_id):
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
        """, (usuario_id,))
        ingresos = cursor.fetchall()
        return ingresos
    except Exception as e:
        print(f"Error al obtener ingreso: {e}")
        return []
    finally:
        cursor.close()
        conn.close()
        
def ObtenerCuentaPorIdUsuario(usuario_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT SaldoActual FROM Cuenta WHERE UsuarioId = %s", (usuario_id,))
        cuentas = cursor.fetchall()
        total = sum(cuenta[0] for cuenta in cuentas) if cuentas else 0
        return total
    except Exception as e:
        print(f"Error al obtener cuenta por ID: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def GastosMes(usuario_id):
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
        cursor.execute(query, (usuario_id,))
        resultado = cursor.fetchone()
        return resultado[0] if resultado else 0  # Devuelve 0 si no hay gastos
    except Exception as e:
        print(f"Error en GastosMes: {e}")
        return None
    finally:
        cursor.close()
        conn.close()
