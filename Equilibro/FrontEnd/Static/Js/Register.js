function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

async function registerUser() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!confirmPassword()) {
        document.getElementById('errorMessage').innerText = "Passwords do not match";
        return;
    }

    document.getElementById('errorMessage').innerText = "";

    const data = {
        name: capitalize(name),
        email: email,
        password: password
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
            throw new Error(errorData.error || 'Request error');
        }

        const result = await response.json();
        console.log('✅ User registered successfully:', result);

        // Show message or redirect
        document.getElementById('errorMessage').innerText = "User registered successfully!";
        await login(email, password); // Automatically login after registration
    } catch (error) {
        console.error('❌ Error registering user:', error);
        document.getElementById('errorMessage').innerText = "Error registering user: " + error.message;
    }
}

function confirmPassword() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        document.getElementById('errorMessage').innerText = "Passwords do not match";
        return false;
    }
    else {
        document.getElementById('errorMessage').innerText = "";
        return true;
    }
}

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

        const result = await response.json();

        if (response.status === 200) {
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
                window.location.href = '/dashboard'; // Redirect to dashboard if form is completed
            }
        } else {
            document.getElementById('errorMessage').innerText = result.error;
            console.error('Login error:', result.error);
        }

    } catch (error) {
        document.getElementById('errorMessage').innerText = 'Network error. Please try again.';
        console.error('Error:', error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("confirmPassword").addEventListener("input", confirmPassword);
    document.getElementById("registerButton").addEventListener("click", async (event) => {
        event.preventDefault();
        await registerUser();
    });
});