async function login(email, password) {
    const data = {
        email: email,
        password: password
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
            console.log('Login successful:', result);
            localStorage.setItem('token', result.token);
            localStorage.setItem('userId', result.user.id);
            localStorage.setItem('name', result.user.username);
            localStorage.setItem('form', result.user.form);
            const formCompleted = result.user.form;
            if (formCompleted == 0) {
                window.location.href = '/questions'; // Redirect to Questions if form is not completed
            }
            else {
                window.location.href = '/dashBoard'; // Redirect to dashboard if form is completed
            }
        } else {
            // Handle non-200 responses
            const errorResult = await response.json();
            document.getElementById('errorMessage').innerText = errorResult.error;
            console.error('Login error:', errorResult.error);
        }

    } catch (error) {
        document.getElementById('errorMessage').innerText = 'Network error. Please try again.';
        console.error('Error:', error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("loginButton").addEventListener("click", async (event) => {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        await login(email, password);
    });
});