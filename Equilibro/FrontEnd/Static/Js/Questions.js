const userId = localStorage.getItem('userId');
const userName = localStorage.getItem('name');

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
}

// Función para manejar estado de carga
function setLoadingState(isLoading) {
    const submitButton = document.getElementById('submitButton');
    const spinner = document.getElementById('submitSpinner');
    
    if (submitButton && spinner) {
        if (isLoading) {
            submitButton.disabled = true;
            spinner.style.display = 'inline-block';
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Setting up your account...';
        } else {
            submitButton.disabled = false;
            spinner.style.display = 'none';
            submitButton.innerHTML = 'Complete Setup & Start Using Equilibro';
        }
    }
}

// Función para capitalizar texto
function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Función para validar el formulario
function validateForm(accountName, accountBalance, cashAmount, category1, category2) {
    if (!accountName || !accountBalance || !cashAmount || !category1 || !category2) {
        showNotification('Please fill in all fields');
        return false;
    }
    
    if (accountName.trim().length < 2) {
        showNotification('Please enter a valid account name');
        return false;
    }
    
    if (parseFloat(accountBalance) < 0 || parseFloat(cashAmount) < 0) {
        showNotification('Amounts cannot be negative');
        return false;
    }
    
    if (category1.trim().length < 2 || category2.trim().length < 2) {
        showNotification('Please enter valid category names');
        return false;
    }
    
    if (category1.toLowerCase() === category2.toLowerCase()) {
        showNotification('Categories must be different');
        return false;
    }
    
    return true;
}

// Saludo personalizado
function greeting() {
    const greetingElement = document.getElementById('greeting');
    if (greetingElement && userName) {
        greetingElement.textContent = `Hello, ${userName}!`;
    }
}

// Crear cuenta
async function createAccount(accountName, initialBalance) {
    const data = {
        name: capitalize(accountName.trim()),
        balance: parseFloat(initialBalance),
        user_id: userId
    };

    try {
        const response = await fetch('/account/createAccount', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Account created:', result);
            return { success: true, data: result };
        } else {
            const error = await response.json();
            console.error('❌ Account creation error:', error);
            return { success: false, error: error.message || 'Failed to create account' };
        }
    } catch (error) {
        console.error("❌ Network error:", error);
        return { success: false, error: 'Network error occurred' };
    }
}

// Crear categoría
async function createCategory(categoryName) {
    const data = {
        name: capitalize(categoryName.trim()),
        user_id: userId
    };

    try {
        const response = await fetch('/expense/createCategory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Category created:', result);
            return { success: true, data: result };
        } else {
            const error = await response.json();
            console.error('❌ Category creation error:', error);
            return { success: false, error: error.message || 'Failed to create category' };
        }
    } catch (error) {
        console.error("❌ Network error:", error);
        return { success: false, error: 'Network error occurred' };
    }
}

// Marcar formulario como completado
async function formCompleted() {
    const data = {
        user_id: userId
    };

    try {
        const response = await fetch('/auth/updateUserFormStatus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Form status updated:', result);
            
            // Actualizar localStorage
            localStorage.setItem('form', '1');
            
            return { success: true, data: result };
        } else {
            const error = await response.json();
            console.error('❌ Form status update error:', error);
            return { success: false, error: error.message || 'Failed to update form status' };
        }
    } catch (error) {
        console.error("❌ Network error:", error);
        return { success: false, error: 'Network error occurred' };
    }
}

// Función principal para manejar el envío del formulario
async function handleFormSubmission(event) {
    event.preventDefault();
    
    // Obtener valores del formulario
    const accountName = document.getElementById('accountName').value;
    const accountBalance = document.getElementById('accountBalance').value;
    const cashAmount = document.getElementById('cashAmount').value;
    const category1 = document.getElementById('category1').value;
    const category2 = document.getElementById('category2').value;

    // Validar formulario
    if (!validateForm(accountName, accountBalance, cashAmount, category1, category2)) {
        return;
    }

    setLoadingState(true);
    showNotification('Setting up your financial profile...', 'success');

    try {
        // Ejecutar todas las operaciones en secuencia
        const results = await Promise.allSettled([
            createAccount(accountName, accountBalance),
            createAccount("Cash", cashAmount),
            createCategory(category1),
            createCategory(category2),
            formCompleted()
        ]);

        // Verificar si hubo errores
        const errors = results.filter(result => 
            result.status === 'rejected' || 
            (result.status === 'fulfilled' && !result.value.success)
        );

        if (errors.length > 0) {
            console.error('Some operations failed:', errors);
            showNotification('Some settings could not be saved. You can update them later in settings.', 'error');
            
            // Redirigir de todas formas después de un breve delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 3000);
        } else {
            showNotification('Profile setup completed successfully! Redirecting...', 'success');
            
            // Redirigir al dashboard después de éxito
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        }

    } catch (error) {
        console.error('Unexpected error during setup:', error);
        showNotification('An unexpected error occurred. Please try again.', 'error');
        setLoadingState(false);
    }
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    // Verificar autenticación
    if (!userId) {
        window.location.href = '/';
        return;
    }

    // Verificar si ya completó el formulario
    const formCompleted = localStorage.getItem('form');
    if (formCompleted === '1') {
        window.location.href = '/dashboard';
        return;
    }

    // Configurar la interfaz
    greeting();
    
    // Event listeners
    const form = document.getElementById('questionnaireForm');
    const submitButton = document.getElementById('submitButton');
    
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
    
    if (submitButton) {
        submitButton.addEventListener('click', handleFormSubmission);
    }
    
    // Limpiar mensajes de error al escribir
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            showNotification(''); // Clear errors on input
        });
    });
});

// Exportar funciones para testing (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        validateForm, 
        capitalize, 
        createAccount, 
        createCategory, 
        formCompleted 
    };
}