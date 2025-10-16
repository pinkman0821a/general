from flask import jsonify, request, Blueprint
from ..Models import CrearCuenta, CrearCategoria, ObtenerCuentasPorUsuario, ActualizarFormularioUsuario, ObtenerCategoriasPorUsuario, CrearGasto, ObtenerGastosPorUsuario,HacerMovimiento,ObtenerCuentaPorid, CrearMovimiento, ObtenerMovimientoPorUsuario, CrearIngreso, ObtenerIngresoPorUsuario, ObtenerCuentaPorIdUsuario, GastosMes
features_bp = Blueprint('features', __name__)

@features_bp.route('/CreateAccount', methods=['POST'])
def CreateAccount():
    data = request.get_json()
    nombre = data.get('nombre')
    saldo = data.get('saldo')
    usuario_id = data.get('usuario_id')

    # Validar campos requeridos
    if not nombre or not saldo or not usuario_id:
        return jsonify({"error": "Todos los campos son requeridos."}), 400

    try:
        saldo = float(saldo)
    except ValueError:
        return jsonify({"error": "El saldo debe ser un número válido."}), 401

    # Intentar crear la cuenta
    creada = CrearCuenta(nombre, saldo, usuario_id)

    if creada:
        return jsonify({
            "message": "Cuenta creada exitosamente.",
            "data": {
                "nombre": nombre,
                "saldo_inicial": saldo,
                "usuario_id": usuario_id
            }
        }), 201
    else:
        return jsonify({"error": "No se pudo crear la cuenta. Revisa los datos o intenta más tarde."}), 500

@features_bp.route('/CreateCategory', methods=['POST'])
def CreateCategory():
    data = request.get_json()
    nombre = data.get('nombre')
    usuario_id = data.get('usuario_id')

    # Validar campos requeridos
    if not nombre or not usuario_id:
        return jsonify({"error": "Todos los campos son requeridos."}), 400

    # Intentar crear la categoria
    creada = CrearCategoria(nombre, usuario_id)

    if creada:
        return jsonify({
            "message": "Categoría creada exitosamente.",
            "data": {
                "nombre": nombre,
                "usuario_id": usuario_id
            }
        }), 201
    else:
        return jsonify({"error": "No se pudo crear la categoría. Revisa los datos o intenta más tarde."}), 500
    
@features_bp.route('/UpdateUserFormStatus', methods=['POST'])
def UpdateUserFormStatus():
    data = request.get_json()
    usuario_id = data.get('usuario_id')

    # Validar campos requeridos
    if not usuario_id:
        return jsonify({"error": "El campo usuario_id es requerido."}), 400

    actualizado = ActualizarFormularioUsuario(usuario_id)

    if actualizado:
        return jsonify({
            "message": "Estado del formulario de usuario actualizado exitosamente.",
            "data": {
                "usuario_id": usuario_id,
                "formulario_actualizado": True
            }
        }), 200
    else:
        return jsonify({"error": "No se pudo actualizar el estado del formulario. Revisa los datos o intenta más tarde."}), 500
    
@features_bp.route('/GetUserAccounts', methods=['POST'])
def GetUserAccounts():
    data = request.get_json()
    usuario_id = data.get('usuario_id')
    
    # Validar campos requeridos
    if not usuario_id:
        return jsonify({"error": "El campo usuario_id es requerido."}), 400
    
    cuentas = ObtenerCuentasPorUsuario(usuario_id)
    if cuentas:
        return jsonify({
            "message": "Cuentas obtenidas exitosamente.",
            "data": cuentas
        }), 200
    else:
        return jsonify({"error": "No se pudieron obtener las cuentas. Revisa los datos o intenta más tarde."}), 500
    
@features_bp.route('/GetUserCategories', methods=['POST'])
def GetUserCategories():
    data = request.get_json()
    usuario_id = data.get('usuario_id')
    
    # Validar campos requeridos
    if not usuario_id:
        return jsonify({"error": "El campo usuario_id es requerido."}), 400
    
    categorias = ObtenerCategoriasPorUsuario(usuario_id)
    if categorias:
        return jsonify({
            "message": "Categorías obtenidas exitosamente.",
            "data": categorias
        }), 200
    else:
        return jsonify({"error": "No se pudieron obtener las categorías. Revisa los datos o intenta más tarde."}), 500
    
@features_bp.route('/CreateExpense', methods=['POST'])
def CreateExpense():
    data = request.get_json()
    Valor = data.get('Valor')
    Descripcion = data.get('Descripcion')
    CuentaId = data.get('CuentaId')
    CategoriaId = data.get('CategoriaId')
    UsuarioId = data.get('UsuarioId')

    # 🧩 Validar campos requeridos
    if not all([Valor, Descripcion, CuentaId, CategoriaId, UsuarioId]):
        return jsonify({"error": "Todos los campos son requeridos."}), 400

    # 💰 Validar que el valor sea numérico y positivo
    try:
        Valor = float(Valor)
        if Valor <= 0:
            return jsonify({"error": "El valor debe ser mayor a 0."}), 400
    except ValueError:
        return jsonify({"error": "El valor debe ser un número válido."}), 400

    # 🔎 Verificar que la cuenta exista
    cuenta = ObtenerCuentaPorid(CuentaId)
    if not cuenta:
        return jsonify({"error": "La cuenta no existe."}), 404

    saldo_actual = float(cuenta[0])

    # 🚫 Validar fondos suficientes
    if Valor > saldo_actual:
        return jsonify({"error": "Fondos insuficientes para realizar este gasto."}), 400

    # 🧮 Calcular nuevo saldo
    nuevo_saldo = saldo_actual - Valor

    # 📝 Intentar crear el gasto y actualizar saldo
    creado = CrearGasto(Valor, Descripcion, CuentaId, CategoriaId, UsuarioId, nuevo_saldo)

    if creado:
        return jsonify({
            "message": "Gasto creado exitosamente.",
            "data": {
                "Valor": Valor,
                "Descripcion": Descripcion,
                "CuentaId": CuentaId,
                "CategoriaId": CategoriaId,
                "UsuarioId": UsuarioId,
                "SaldoAnterior": saldo_actual,
                "SaldoNuevo": nuevo_saldo
            }
        }), 201
    else:
        return jsonify({"error": "No se pudo crear el gasto. Revisa los datos o intenta más tarde."}), 500

@features_bp.route('/GetUserExpenses', methods=['POST'])
def GetUserExpenses():
    data = request.get_json()
    usuario_id = data.get('usuario_id')
    
    if not usuario_id:
        return jsonify({"error": "El campo usuario_id es requerido."}), 400
    
    # Consultas
    gastos = ObtenerGastosPorUsuario(usuario_id) or []
    movimientos = ObtenerMovimientoPorUsuario(usuario_id) or []
    ingresos = ObtenerIngresoPorUsuario(usuario_id) or []

    # Listas finales (vacías por defecto)
    gastos_list = []
    movimientos_list = []
    ingresos_list = []

    # Convertir resultados en listas manejables
    if ingresos:
        ingresos_list = [
            [ingreso[0], ingreso[1], "Ingreso", ingreso[2], "Ingreso"]
            for ingreso in ingresos
        ]

    if movimientos:
        movimientos_list = [
            [movimiento[0], movimiento[1], movimiento[2] + " Movimiento", movimiento[3], "Movimiento"]
            for movimiento in movimientos
        ]

    if gastos:
        gastos_list = [
            [gasto[0], gasto[1], gasto[2], gasto[3], gasto[4]]
            for gasto in gastos
        ]

    # Unir todos los datos (puede haber solo algunos)
    data_total = gastos_list + movimientos_list + ingresos_list

    if data_total:
        return jsonify({
            "message": "Datos obtenidos exitosamente.",
            "data": data_total
        }), 200
    else:
        return jsonify({"error": "No hay registros disponibles para este usuario."}), 404
    
@features_bp.route('/MakeMovement', methods=['POST'])
def MakeMovement():
    data = request.get_json()
    usuario_id = data.get('usuario_id')
    idcuentaA = data.get('idcuentaA')  # Cuenta origen
    idcuentaB = data.get('idcuentaB')  # Cuenta destino
    monto = data.get('monto')

    # ✅ Validar campos requeridos
    if not all([usuario_id, idcuentaA, idcuentaB, monto]):
        return jsonify({"error": "Todos los campos son requeridos."}), 400

    # ✅ Validar que el monto sea numérico y positivo
    try:
        monto = float(monto)
        if monto <= 0:
            return jsonify({"error": "El monto debe ser mayor a 0."}), 400
    except ValueError:
        return jsonify({"error": "El monto debe ser un número válido."}), 400

    # 🔎 Verificar que las cuentas existan
    valora = ObtenerCuentaPorid(idcuentaA)
    valorb = ObtenerCuentaPorid(idcuentaB)

    if not valora or not valorb:
        return jsonify({"error": "Una o ambas cuentas no existen."}), 404

    saldo_a = float(valora[0])  # Saldo de cuenta origen
    saldo_b = float(valorb[0])  # Saldo de cuenta destino

    # 🚫 Validar fondos suficientes en la cuenta origen
    if monto > saldo_a:
        return jsonify({
            "error": f"Fondos insuficientes en la cuenta origen (Saldo actual: {saldo_a}, Monto: {monto})."
        }), 400

    # 🧮 Calcular nuevos saldos
    nuevo_saldo_a = saldo_a - monto
    nuevo_saldo_b = saldo_b + monto

    print(f"DEBUG: saldo_a={saldo_a}, saldo_b={saldo_b}, nuevo_a={nuevo_saldo_a}, nuevo_b={nuevo_saldo_b}")

    # 🔄 Actualizar saldos
    realizado = HacerMovimiento(idcuentaA, nuevo_saldo_a, idcuentaB, nuevo_saldo_b)

    if realizado:
        # 🧾 Registrar el movimiento
        realizadomovimiento = CrearMovimiento(usuario_id, monto, idcuentaA, idcuentaB)

        if realizadomovimiento:
            return jsonify({
                "message": "Movimiento realizado exitosamente.",
                "data": {
                    "cuenta_origen": idcuentaA,
                    "cuenta_destino": idcuentaB,
                    "monto": monto,
                    "saldo_origen_anterior": saldo_a,
                    "saldo_origen_nuevo": nuevo_saldo_a,
                    "saldo_destino_anterior": saldo_b,
                    "saldo_destino_nuevo": nuevo_saldo_b
                }
            }), 200
        else:
            return jsonify({"error": "No se pudo registrar el movimiento en la base de datos."}), 500
    else:
        return jsonify({"error": "No se pudo actualizar los saldos. Intenta nuevamente."}), 500

@features_bp.route('/MakeEntry', methods=['POST'])
def MakeEntry():
    data = request.get_json()
    usuario_id = data.get('usuario_id')
    idcuenta = data.get('idcuenta')
    monto = data.get('monto')
    
    if not usuario_id or not idcuenta or not monto:
        return jsonify({"error": "Todos los campos son requeridos."}), 400
    
    try:
        monto = float(monto)
    except ValueError:
        return jsonify({"error": "El monto debe ser numérico."}), 400

    cuenta = ObtenerCuentaPorid(idcuenta)
    if not cuenta:
        return jsonify({"error": "La cuenta no existe."}), 404

    saldo_actual = float(cuenta[0])
    nuevo_saldo = saldo_actual + monto

    realizado = CrearIngreso(usuario_id, monto, idcuenta, nuevo_saldo)
    
    if realizado:
        return jsonify({
            "message": "Ingreso realizado exitosamente.",
            "data": {
                "cuenta": idcuenta,
                "monto": monto,
                "nuevo_saldo": nuevo_saldo
            }
        }), 200
    else:
        return jsonify({"error": "No se pudo realizar el ingreso."}), 500

@features_bp.route('/TotalBalance', methods=['POST'])
def TotalBalance():
    data = request.get_json()
    usuario_id = data.get('usuario_id')
    
    if not usuario_id:
        return jsonify({"error": "Todos los campos son requeridos."}),400
    
    resultado = ObtenerCuentaPorIdUsuario(usuario_id)
    
    if resultado:
        return jsonify({
            "data": resultado
        }), 200
    else:
        return jsonify({"error": "No se pudo traer las cuentas"}), 501
    
@features_bp.route('/MonthlyExpenses', methods=['POST'])
def MonthlyExpenses():
    data = request.get_json()
    usuario_id = data.get('usuario_id')
    
    if not usuario_id:
        return jsonify({"error": "El campo usuario_id es requerido."}), 400
    
    resultado = GastosMes(usuario_id)
    
    if resultado is not None:
        return jsonify({
            "data": resultado
        }), 200
    else:
        return jsonify({"error": "No se pudieron obtener los gastos del mes."}), 500
