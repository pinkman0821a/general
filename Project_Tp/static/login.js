// Seleccionamos el formulario de login y escuchamos el evento 'submit'
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitamos que el formulario se envíe de la forma tradicional (recargando la página)

    // Obtenemos los valores de los campos de username y password
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        // Hacemos un POST al endpoint /login enviando username y password en formato JSON
        const res = await fetch('/login', {
            method: 'POST', // Tipo de solicitud HTTP
            headers: { 'Content-Type': 'application/json' }, // Indicamos que enviamos JSON
            body: JSON.stringify({ username, password }) // Convertimos los datos a JSON
        });

        // Esperamos la respuesta y la convertimos a JSON
        const data = await res.json();

        // Si la respuesta indica éxito (credenciales correctas)
        if (data.success) {
            // Guardamos el ID del usuario y el username en localStorage
            // Esto nos permite mantener la sesión en el navegador
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('username', username);

            // Redirigimos al usuario a la página del chat
            window.location.href = '/chat';
        } else {
            // Si las credenciales son incorrectas, mostramos un mensaje de error
            document.getElementById('error').innerText = "Usuario o contraseña incorrectos";
        }
    } catch (err) {
        // Capturamos cualquier error de la solicitud y lo mostramos en consola
        console.error(err);
    }
});