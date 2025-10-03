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
            await login (username,password)
            const currentUserId = localStorage.getItem('user_id');
            await general (currentUserId)
            window.location.href = '/';
        } else {
            document.getElementById('error').innerText = data.error || 'Registration failed';
        }
    } catch (error) {
        document.getElementById('error').innerText = 'An error occurred. Please try again.';
    }   
});

async function login(username,password) {
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.status === 200) {

            localStorage.setItem('token', data.token);
            localStorage.setItem('user_id', data.user.id);
            localStorage.setItem('username', data.user.username);
            window.location.href = '/chat';
        }
 
        else {
            document.getElementById('error').innerText = data.error || 'Login failed';
        }
    } catch (error) {
        document.getElementById('error').innerText = 'An error occurred. Please try again.';
    }  
}

const currentUserId = localStorage.getItem('user_id');

async function general(user_id) {
    const hall_id = 1;
    try {
        const response = await fetch('/chat/add-user-to-hall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, hall_id })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('User added to hall:', data);
            return data; // <- para que la función devuelva algo útil
        } else {
            console.error('Failed to add user to hall:', data.error || data);
            return null;
        }
    } catch (error) {
        console.error('Error adding user to hall:', error);
        return null;
    }
}
