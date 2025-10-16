const IdUser = localStorage.getItem('IdUser');
const Nombre = localStorage.getItem('Nombre');

function Saludo() {
    document.getElementById('saludo').innerText = `¡Hola, ${Nombre}!`;
}

async function CrearCuenta(nombreCuenta, saldoInicial) {
    
    const data = {
        nombre: nombreCuenta,
        saldo: parseFloat(saldoInicial),
        usuario_id: IdUser
    };

    try {
        const response = await fetch('/features/CreateAccount', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            console.log(result);
        } else {
            const error = await response.json();
            console.error(error);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

async function CrearCategoria(nombreCategoria) {
    
    const data = {
        nombre: nombreCategoria,
        usuario_id: IdUser
    };

    try {
        const response = await fetch('/features/CreateCategory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            console.log(result);
        } else {
            const error = await response.json();
            console.error(error);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

async function FormularioCompletado() {
    const data = {
        usuario_id: IdUser
    };

    try {
        const response = await fetch('/features/UpdateUserFormStatus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            const result = await response.json();
            console.log(result);
        } else {
            const error = await response.json();
            console.error(error);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    Saludo();
    document.getElementById("submit-button").addEventListener("click", async (event) => {
        event.preventDefault();
        const nombreCuenta = document.getElementById('Question1').value;
        const saldoInicial = document.getElementById('Question2').value;
        await CrearCuenta(nombreCuenta, saldoInicial);
        const nombreCuenta2 = "Efectivo";
        const saldoInicial2 = document.getElementById('Question3').value;
        await CrearCuenta(nombreCuenta2, saldoInicial2);
        const nombreCategoria = document.getElementById('Question4').value;
        await CrearCategoria(nombreCategoria);
        const nombreCategoria2 = document.getElementById('Question5').value;
        await CrearCategoria(nombreCategoria2);
        await FormularioCompletado();
        window.location.href = '/dashboard';
    });
});
