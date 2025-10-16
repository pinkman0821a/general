const IdUser = localStorage.getItem('IdUser');
const Nombre = localStorage.getItem('Nombre');

function Saludo() {
    document.getElementById('saludo').innerText = `¡Hola, ${Nombre}!`;
}

async function obtenerCuentasUsuario(usuarioId) {
    const payload = { usuario_id: usuarioId };

    try {
        const response = await fetch('/features/GetUserAccounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error al obtener cuentas');
        }

        const result = await response.json();
        console.log(result);
        llenarSelect(result.data, 'inputGroupSelect01');
        llenarSelect(result.data, 'inputGroupSelect02');
        llenarSelect(result.data, 'inputGroupSelect03');
        llenarSelect(result.data, 'inputGroupSelect04');
        return result.data;
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function obtenerCategoriasUsuario(usuarioId) {
    const payload = { usuario_id: usuarioId };

    try {
        const response = await fetch('/features/GetUserCategories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error al obtener categorias');
        }
        const result = await response.json();
        console.log(result);
        llenarSelect(result.data, 'inputGroupSelect05');
        return result.data;
    } catch (error) {
        console.error(error);
        return [];
    }
}

function llenarSelect(cuentas, idelement) {
    const select = document.getElementById(idelement);

    // Limpiar opciones anteriores
    select.innerHTML = '<option selected disabled>Selecciona una cuenta...</option>';

    // Recorrer las cuentas y agregarlas como <option>
    cuentas.forEach(cuenta => {
        const id = cuenta[0];
        const nombre = cuenta[1];

        const option = document.createElement('option');
        option.value = id;
        option.textContent = nombre;

        select.appendChild(option);
    });
}

// 👉 Función para poner la primera letra en mayúscula
function capitalizar(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

async function crearGasto(Valor, Descripcion, CuentaId, CategoriaId, UsuarioId) {
    const payload = {
        Valor,
        Descripcion: capitalizar(Descripcion),  // 👈 capitalizamos aquí
        CuentaId,
        CategoriaId,
        UsuarioId
    };

    try {
        const response = await fetch('/features/CreateExpense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        return { ok: response.ok, data: result };
    } catch (error) {
        console.error(error);
        return { ok: false, data: { error: "Error al crear gasto." } };
    }
}

async function manejarCreacionGasto() {
    const Valor = document.getElementById('Valor').value.trim();
    const Descripcion = document.getElementById('Descripcion').value.trim();
    const CuentaId = document.getElementById('inputGroupSelect01').value;
    const CategoriaId = document.getElementById('inputGroupSelect05').value;

    const mensaje = document.getElementById('error-message');

    // ✅ Validación antes de enviar
    if (!Valor || !Descripcion || !CuentaId || !CategoriaId) {
        mensaje.innerText = "⚠️ Todos los campos son obligatorios.";
        mensaje.style.color = "orange";
        setTimeout(() => (mensaje.innerText = ''), 3000);
        return;
    }

    const resultado = await crearGasto(Valor, Descripcion, CuentaId, CategoriaId, IdUser);

    if (resultado.ok) {
        mensaje.innerText = "✅ Gasto creado exitosamente.";
        mensaje.style.color = "green";

        // limpia el formulario pero NO cierra el modal
        document.getElementById('Valor').value = '';
        document.getElementById('Descripcion').value = '';
        document.getElementById('inputGroupSelect01').value = '';
        document.getElementById('inputGroupSelect05').value = '';

        await mostrarGastos(IdUser);
    } else {
        mensaje.innerText = `❌ ${resultado.data.error || "Error desconocido."}`;
        mensaje.style.color = "red";
    }

    setTimeout(() => {
        mensaje.innerText = '';
    }, 3000);
}

async function traerGastos(usuarioId) {
    const payload = { usuario_id: usuarioId };

    try {
        const response = await fetch('/features/GetUserExpenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error al obtener gastos');
        }

        const result = await response.json();
        console.log(result);
        return result.data;
    } catch (error) {
        console.error(error);
    }
}

function formatearFecha(fechaString) {
    const fecha = new Date(fechaString);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    return `${dia} ${horas}:${minutos}`;
}

async function mostrarGastos(usuarioId) {
    try {
        const gastos = await traerGastos(usuarioId);

        if (!gastos || gastos.length === 0) {
            console.log('No hay gastos para mostrar.');
            return;
        }

        // Ordenar por fecha (más recientes primero)
        gastos.sort((a, b) => new Date(b[1]) - new Date(a[1]));

        const tbody = document.getElementById('tbodyGastos');
        tbody.innerHTML = '';

        gastos.forEach(gasto => {
            const [Valor, fecha, Descripcion, cuenta, Categoria] = gasto;
            const fechaFormateada = formatearFecha(fecha);

            // Colores según tipo
            let colorMonto = 'red';
            if (Categoria === 'Movimiento') colorMonto = 'blue';
            if (Categoria === 'Ingreso') colorMonto = 'green';

            const fila = `
                <tr>
                    <td>${Descripcion}</td>
                    <td style="color: ${colorMonto}; font-weight: bold;">${Valor}</td>
                    <td>${cuenta}</td>
                    <td>${Categoria}</td>
                    <td>${fechaFormateada}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', fila);
        });

    } catch (error) {
        console.error('Error al mostrar los gastos:', error);
    }
}


async function MoverPlata(Valor, idcuentaA, idcuentab, usuarioId) {
    const payload = {
        usuario_id: usuarioId,
        idcuentaA: idcuentaA,
        idcuentaB: idcuentab,
        monto: Valor
    };

    try {
        const response = await fetch('/features/MakeMovement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error('Error al crear Movimiento');
        }

        const result = await response.json();
        console.log(result);
    } catch (error) {
        console.error(error);
    }
}

function crearMovimientoExitoso() {
    const mensaje = document.getElementById('error-message-movimiento');
    mensaje.innerText = "Movimiento creado exitosamente.";
    mensaje.style.color = "green";
    document.getElementById('Valor2').value = '';
    document.getElementById('inputGroupSelect02').value = '';
    document.getElementById('inputGroupSelect03').value = '';
    mostrarGastos(IdUser);

    const botonCerrar = document.querySelector('.btn-close[data-bs-dismiss="modal"]');
    if (botonCerrar) {
        botonCerrar.click(); // Simula el clic
    }

    setTimeout(() => {
        document.getElementById('error-message-movimiento').innerText = '';
    }, 3000);
}

async function AgregarPlata(usuarioId, idcuenta, monto) {
    const payload = {
        usuario_id: usuarioId,
        idcuenta: idcuenta,
        monto: monto
    };

    try {
        const response = await fetch('/features/MakeEntry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error al crear Ingreso');
        }

        const result = await response.json();
        console.log(result);
    } catch (error) {
        console.error(error);
    }
}

function crearIngresoExitoso() {
    const mensaje = document.getElementById('error-message-ingreso');
    mensaje.innerText = "Ingreso creado exitosamente.";
    mensaje.style.color = "green";
    document.getElementById('Valor3').value = '';
    document.getElementById('inputGroupSelect04').value = '';
    mostrarGastos(IdUser);

    const botonCerrar = document.querySelector('.btn-close[data-bs-dismiss="modal"]');
    if (botonCerrar) {
        botonCerrar.click(); // Simula el clic
    }

    setTimeout(() => {
        document.getElementById('error-message-ingreso').innerText = '';
    }, 3000);
}

async function SaldoTotal(usuarioId) {
    const payload = {
        usuario_id: usuarioId
    };

    try {
        const response = await fetch('/features/TotalBalance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error al traer el saldo total');
        }

        const result = await response.json();
        console.log(result);
        return result
    } catch (error) {
        console.error(error);
    }
}

async function ImprimirSaldoTotal() {
    const resultado = await SaldoTotal(IdUser);
    const saldo = resultado?.data ?? '0';
    const elemento = document.getElementById('SaldoTotal');
    elemento.innerText = `Saldo total: ${saldo}`;
    elemento.style.fontWeight = 'bold';
}

async function GastosMes(usuarioId) {
    const payload = {
        usuario_id: usuarioId
    };

    try {
        const response = await fetch('/features/MonthlyExpenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error al los gastos del mes');
        }

        const result = await response.json();
        console.log(result);
        return result
    } catch (error) {
        console.error(error);
    }
}

async function ImprimirGastosMes() {
    const resultado = await GastosMes(IdUser);
    const saldo = resultado?.data ?? '0';
    const elemento = document.getElementById('GastosMes');
    elemento.innerText = `Gastos mes: ${saldo}`;
    elemento.style.fontWeight = 'bold';
}

document.addEventListener("DOMContentLoaded", async () => {
    Saludo();
    await ImprimirSaldoTotal();
    await ImprimirGastosMes();
    await obtenerCuentasUsuario(IdUser);
    await obtenerCategoriasUsuario(IdUser);
    await mostrarGastos(IdUser);
    document.getElementById('btnAgregarGasto').addEventListener('click', async () => {
        await manejarCreacionGasto();  
        await ImprimirSaldoTotal();   
    });
    document.getElementById('btnAgregarMovimiento').addEventListener('click', async () => {
        const Valor = document.getElementById('Valor2').value;
        const idcuentaA = document.getElementById('inputGroupSelect02').value;
        const idcuentaB = document.getElementById('inputGroupSelect03').value;
        await MoverPlata(Valor, idcuentaA, idcuentaB, IdUser);
        crearMovimientoExitoso();
    });
    document.getElementById('btnIngresarPlata').addEventListener('click', async () => {
        const Valor = document.getElementById('Valor3').value;
        const idcuenta = document.getElementById('inputGroupSelect04').value;
        await AgregarPlata(IdUser, idcuenta, Valor);
        crearIngresoExitoso();
        await ImprimirSaldoTotal();
    });
})