// Cache para tokens y datos de usuario
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

// Función para mostrar notificaciones
function showNotification(message, type = 'error') {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.className = `form-text small ${type === 'error' ? 'text-danger' : 'text-success'}`;
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            errorElement.textContent = '';
        }, 5000);
    }
}

// Función para manejar el estado de carga
function setLoadingState(isLoading) {
    const loginButton = document.getElementById('loginButton');
    const spinner = document.getElementById('loginSpinner');
    
    if (loginButton && spinner) {
        if (isLoading) {
            loginButton.disabled = true;
            spinner.style.display = 'inline-block';
            loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Signing In...';
        } else {
            loginButton.disabled = false;
            spinner.style.display = 'none';
            loginButton.innerHTML = 'Sign In';
        }
    }
}

// Función para validar el formulario
function validateForm(email, password) {
    if (!email || !password) {
        showNotification('Please fill in all fields');
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
    
    return true;
}

async function login(email, password) {
    // Validar formulario antes de enviar
    if (!validateForm(email, password)) {
        return;
    }

    const data = {
        email: email,
        password: password
    };
    
    setLoadingState(true);
    showNotification(''); // Clear previous errors

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
            
            // Guardar datos en cache/localStorage
            authCache.set('token', result.token);
            authCache.set('userId', result.user.id);
            authCache.set('name', result.user.username);
            authCache.set('form', result.user.form);
            
            showNotification('Login successful! Redirecting...', 'success');
            
            // Redirección basada en el estado del formulario
            setTimeout(() => {
                const formCompleted = result.user.form;
                if (formCompleted == 0) {
                    window.location.href = '/questions';
                } else {
                    window.location.href = '/dashBoard';
                }
            }, 1000);
            
        } else {
            // Manejar errores de la API
            const errorMessage = result.error || 'Login failed. Please try again.';
            showNotification(errorMessage);
            console.error('Login error:', errorMessage);
        }

    } catch (error) {
        console.error('Network error:', error);
        showNotification('Network error. Please check your connection and try again.');
    } finally {
        setLoadingState(false);
    }
}

// Función para manejar el envío del formulario
function handleLoginFormSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    login(email, password);
}

// Función para verificar si ya está autenticado
// Función mejorada para verificar autenticación
function checkExistingAuth() {
    const token = authCache.get('token');
    const userId = authCache.get('userId');
    
    // Verificar que ambos existan y tengan valores válidos
    if (token && userId && userId !== 'null' && userId !== 'undefined') {
        const formCompleted = authCache.get('form');
        
        // Redirigir según el estado del formulario
        if (formCompleted == 0) {
            window.location.href = '/questions';
        } else {
            window.location.href = '/dashBoard';
        }
        return true;
    }
    
    // Si no está autenticado, limpiar cualquier dato residual
    authCache.clear();
    return false;
}

// Función para manejar tecla Enter
function handleEnterKey(event) {
    if (event.key === 'Enter') {
        handleLoginFormSubmit(event);
    }
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    // Verificar si ya está autenticado
    checkExistingAuth();
    
    // Event listeners
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginFormSubmit);
    }
    
    if (loginButton) {
        loginButton.addEventListener('click', handleLoginFormSubmit);
    }
    
    // Enter key support
    if (emailInput) {
        emailInput.addEventListener('keypress', handleEnterKey);
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', handleEnterKey);
    }
    
    // Limpiar mensajes de error al empezar a escribir
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            showNotification(''); // Clear error on input
        });
    });
});

// Exportar funciones para testing (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { login, validateForm, showNotification };
}