document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (data.success) {
            // Guardar ID de usuario y username en localStorage
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('username', username);

            // Redirigir al chat
            window.location.href = '/chat';
        } else {
            document.getElementById('error').innerText = "Usuario o contraseña incorrectos";
        }
    } catch (err) {
        console.error(err);
    }
});
