async function iniciarSesion() {
    const Email = document.getElementById('Email1').value;
    const Contraseña = document.getElementById('Password1').value;

    const data = {
        correo: Email,
        contrasena: Contraseña
    };

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', 
            body: JSON.stringify(data)
        });

        if (response.status === 200) {
            const result = await response.json();
            console.log('Inicio de sesión exitoso:', result);
            window.location.href = '/Dashboard'; // Redirigir al dashboard
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("login-button").addEventListener("click", async (event) => {
        event.preventDefault();
        await iniciarSesion();
    });
});