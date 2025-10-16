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
            localStorage.setItem('token', result.token);
            localStorage.setItem('IdUser', result.user.id);
            localStorage.setItem('Nombre', result.user.username);
            localStorage.setItem('Formulario', result.user.formulario);
            const formularioCompletado = result.user.formulario;
            if (formularioCompletado == 0) {
                window.location.href = '/Questions'; // Redirigir a Questions si el formulario no está completado
            }
            else {
                window.location.href = '/Dashboard'; // Redirigir al dashboard si el formulario está completado
            }
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