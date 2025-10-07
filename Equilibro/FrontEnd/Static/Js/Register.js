async function registerUser() {
    const Nombre = document.getElementById('exampleInputName').value.trim();
    const Email = document.getElementById('exampleInputEmail1').value.trim();
    const Contraseña = document.getElementById('Password1').value;

    if (!ConfirmarContraseña()) {
        document.getElementById('error-message').innerText = "Las contraseñas no coinciden";
        return;
    }

    document.getElementById('error-message').innerText = "";

    const data = {
        nombre: Nombre,
        correo: Email,
        contrasena: Contraseña
    };

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error en la solicitud');
        }

        const result = await response.json();
        console.log('✅ Usuario registrado correctamente:', result);

        // Puedes mostrar mensaje o redirigir
        document.getElementById('error-message').innerText = "Usuario registrado con éxito!";
        window.location.href = '/Dashboard'; // Redirigir al dashboard
    } catch (error) {
        console.error('❌ Error al registrar usuario:', error);
        document.getElementById('error-message').innerText = "Error al registrar usuario: " + error.message;
    }
}

function ConfirmarContraseña() {
    const Contraseña = document.getElementById('Password1').value;
    const ConfirmarContraseñas = document.getElementById('Password2').value;

    if (Contraseña !== ConfirmarContraseñas) {
        document.getElementById('error-message').innerText = "Las contraseñas no coinciden";
        return false;
    }
    else {
        document.getElementById('error-message').innerText = "";
        return true;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("Password2").addEventListener("input", ConfirmarContraseña);
    document.getElementById("register-button").addEventListener("click", async (event) => {
        event.preventDefault();
        await registerUser();
    });
});