// Cache para autenticación (consistente con login.js)
const authCache = {
    get: (key) => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
    clear: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('name');
        localStorage.removeItem('form');
    }
};

// Función para capitalizar nombres
function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Función para mostrar notificaciones
function showNotification(message, type = 'error') {
    const errorElement = document.getElementById('errorMessage');
    const successElement = document.getElementById('successMessage');
    
    // Limpiar ambos mensajes primero
    if (errorElement) errorElement.textContent = '';
    if (successElement) successElement.textContent = '';
    
    if (type === 'error' && errorElement) {
        errorElement.textContent = message;
    } else if (type === 'success' && successElement) {
        successElement.textContent = message;
    }
    
    // Auto-ocultar después de 5 segundos (solo errores)
    if (type === 'error') {
        setTimeout(() => {
            if (errorElement) errorElement.textContent = '';
        }, 5000);
    }
}

// Función para manejar el estado de carga
function setLoadingState(isLoading) {
    const registerButton = document.getElementById('registerButton');
    const spinner = document.getElementById('registerSpinner');
    
    if (registerButton && spinner) {
        if (isLoading) {
            registerButton.disabled = true;
            spinner.style.display = 'inline-block';
            registerButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Creating Account...';
        } else {
            registerButton.disabled = false;
            spinner.style.display = 'none';
            registerButton.innerHTML = 'Create Account';
        }
    }
}

// Función para verificar fortaleza de contraseña
function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrength');
    if (!strengthBar) return;
    
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    
    strengthBar.className = 'password-strength';
    
    if (password.length === 0) {
        strengthBar.style.width = '0%';
        return;
    }
    
    if (strength <= 25) {
        strengthBar.classList.add('strength-weak');
    } else if (strength <= 50) {
        strengthBar.classList.add('strength-fair');
    } else if (strength <= 75) {
        strengthBar.classList.add('strength-good');
    } else {
        strengthBar.classList.add('strength-strong');
    }
}

// Función para verificar coincidencia de contraseñas
function confirmPassword() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchElement = document.getElementById('passwordMatch');
    
    if (!password || !confirmPassword) {
        if (matchElement) matchElement.style.display = 'none';
        return false;
    }
    
    if (password === confirmPassword && password.length > 0) {
        if (matchElement) {
            matchElement.style.display = 'block';
            matchElement.className = 'form-text text-success';
        }
        return true;
    } else {
        if (matchElement) {
            matchElement.style.display = 'block';
            matchElement.className = 'form-text text-danger';
            matchElement.innerHTML = '<i class="bi bi-x-circle"></i> Passwords do not match';
        }
        return false;
    }
}

// Función para validar el formulario completo
function validateForm(name, email, password, confirmPassword) {
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Please fill in all fields');
        return false;
    }
    
    if (name.length < 2) {
        showNotification('Please enter a valid name');
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address');
        return false;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long');
        return false;
    }
    
    if (!confirmPassword()) {
        showNotification('Passwords do not match');
        return false;
    }
    
    return true;
}

// Función principal de registro
async function registerUser() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirmPasswordValue = document.getElementById('confirmPassword').value;

    // Validar formulario
    if (!validateForm(name, email, password, confirmPasswordValue)) {
        return;
    }

    const data = {
        name: capitalize(name),
        email: email,
        password: password
    };

    setLoadingState(true);
    showNotification(''); // Clear previous messages

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ User registered successfully:', result);
            showNotification('Account created successfully! Logging you in...', 'success');
            
            // Login automático después del registro
            await loginAfterRegister(email, password);
            
        } else {
            const errorMessage = result.error || 'Registration failed. Please try again.';
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('❌ Error registering user:', error);
        showNotification(`Error: ${error.message}`);
    } finally {
        setLoadingState(false);
    }
}

// Función de login después del registro (separada para mejor organización)
async function loginAfterRegister(email, password) {
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
            console.log('Login successful after registration:', result);
            
            // Guardar datos en cache
            authCache.set('token', result.token);
            authCache.set('userId', result.user.id);
            authCache.set('name', result.user.username);
            authCache.set('form', result.user.form);
            
            showNotification('Welcome to Equilibro! Redirecting...', 'success');
            
            // Redirección con delay para que el usuario vea el mensaje
            setTimeout(() => {
                const formCompleted = result.user.form;
                if (formCompleted == 0) {
                    window.location.href = '/questions';
                } else {
                    window.location.href = '/dashboard';
                }
            }, 1500);
            
        } else {
            // Si el login automático falla, redirigir al login manual
            showNotification('Account created! Please login manually.', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        }

    } catch (error) {
        console.error('Error during auto-login:', error);
        showNotification('Account created! Please login to continue.', 'success');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
}

// Función para manejar el envío del formulario
function handleRegisterFormSubmit(event) {
    event.preventDefault();
    registerUser();
}

// Función para manejar tecla Enter
function handleEnterKey(event) {
    if (event.key === 'Enter') {
        handleRegisterFormSubmit(event);
    }
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    // Event listeners para el formulario
    const registerForm = document.getElementById('registerForm');
    const registerButton = document.getElementById('registerButton');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterFormSubmit);
    }
    
    if (registerButton) {
        registerButton.addEventListener('click', handleRegisterFormSubmit);
    }
    
    // Event listeners para validación en tiempo real
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
            confirmPassword();
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', confirmPassword);
        confirmPasswordInput.addEventListener('keypress', handleEnterKey);
    }
    
    // Enter key support para otros campos
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keypress', handleEnterKey);
        input.addEventListener('input', () => {
            showNotification(''); // Clear errors on input
        });
    });
});

// Exportar funciones para testing (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { registerUser, validateForm, confirmPassword, checkPasswordStrength };
}