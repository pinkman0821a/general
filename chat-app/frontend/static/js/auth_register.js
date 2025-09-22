document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.status === 201) {
            window.location.href = '/';
        } else {
            document.getElementById('error').innerText = data.error || 'Registration failed';
        }
    } catch (error) {
        document.getElementById('error').innerText = 'An error occurred. Please try again.';
    }   
});