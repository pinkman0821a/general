const userId = localStorage.getItem('userId');
const userName = localStorage.getItem('name');
let currentChartType = 'pie';
let accountsChartInstance = null;

// Cache para datos
const accountsCache = {
    get: (key) => sessionStorage.getItem(key),
    set: (key, value) => sessionStorage.setItem(key, JSON.stringify(value)),
    clear: () => sessionStorage.clear()
};

// Función de logout
async function logout() {
    try {
        await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.log('Logout request failed, continuing with client-side cleanup');
    } finally {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'error', elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `form-text small ${type === 'error' ? 'text-danger' : 'text-success'}`;
        
        if (type === 'error') {
            setTimeout(() => {
                element.textContent = '';
            }, 5000);
        }
    }
}

// Función para manejar estados de carga
function setLoadingState(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    const spinner = document.getElementById(buttonId.replace('Button', 'Spinner'));
    
    if (button && spinner) {
        if (isLoading) {
            button.disabled = true;
            spinner.style.display = 'inline-block';
        } else {
            button.disabled = false;
            spinner.style.display = 'none';
        }
    }
}

// Función para capitalizar texto
function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Función para actualizar la fecha actual
function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Saludo personalizado
function greeting() {
    const greetingElement = document.getElementById('greeting');
    if (greetingElement && userName) {
        greetingElement.textContent = `Hello, ${userName}!`;
    }
}

// Obtener cuentas del usuario
async function getUserAccounts(userId) {
    const cacheKey = `accounts-${userId}`;
    const cached = accountsCache.get(cacheKey);
    
    if (cached) {
        return JSON.parse(cached);
    }

    const payload = { user_id: userId };

    try {
        const response = await fetch('/account/getUserAccounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error getting accounts');
        }

        const result = await response.json();
        console.log('User accounts:', result);
        
        // Guardar en cache
        accountsCache.set(cacheKey, result.data);
        return result.data;
    } catch (error) {
        console.error('Error fetching accounts:', error);
        showNotification('Error loading accounts', 'error', 'accountErrorMessage');
        return [];
    }
}

// Crear nueva cuenta
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

        const result = await response.json();
        return { ok: response.ok, data: result };
    } catch (error) {
        console.error('Error creating account:', error);
        return { ok: false, data: { error: "Error creating account." } };
    }
}

// Obtener balance total
async function getTotalBalance(userId) {
    const payload = { user_id: userId };

    try {
        const response = await fetch('/expense/totalBalance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error getting total balance');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching total balance:', error);
        return { data: '0.00' };
    }
}

// Mostrar balance total
async function displayTotalBalance() {
    const result = await getTotalBalance(userId);
    const balance = result?.data ?? '0.00';
    const element = document.getElementById('totalBalance');
    if (element) {
        element.textContent = `$${parseFloat(balance).toFixed(2)}`;
    }
}

// Mostrar lista de cuentas en la tabla
async function displayAccountsTable() {
    const accounts = await getUserAccounts(userId);
    const tbody = document.getElementById('accountsTableBody');
    
    if (!tbody) return;

    if (!accounts || accounts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="2" class="text-center text-muted py-4">
                    <i class="bi bi-wallet display-4"></i>
                    <p class="mt-2">No accounts yet</p>
                    <p class="small">Click "Add Account" to create your first account</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    accounts.forEach(account => {
        // account[0] = id, account[1] = name, account[2] = balance
        const name = account[1];
        const balance = parseFloat(account[2]).toFixed(2);
        
        html += `
            <tr>
                <td class="fw-semibold">${name}</td>
                <td class="fw-bold text-success">$${balance}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Preparar datos para el gráfico
function prepareChartData(accounts) {
    const names = [];
    const balances = [];
    let totalBalance = 0;
    
    accounts.forEach(account => {
        // account[1] = name, account[2] = balance
        const name = account[1];
        const balance = parseFloat(account[2]);
        
        names.push(name);
        balances.push(balance);
        totalBalance += balance;
    });

    return {
        names: names,
        balances: balances,
        total: totalBalance
    };
}

// Actualizar gráfico de cuentas
function updateAccountsChart(accounts) {
    const canvas = document.getElementById('accountsChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Destruir el gráfico anterior si existe
    if (accountsChartInstance) {
        accountsChartInstance.destroy();
        accountsChartInstance = null;
    }

    // Mostrar mensaje si no hay datos
    const emptyState = document.getElementById('chartEmptyState');
    if (!accounts || accounts.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const chartData = prepareChartData(accounts);
    const { names, balances, total } = chartData;

    // Colores para las cuentas
    const backgroundColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#8AC926', '#C9CBCF',
        '#1982C4', '#6A4C93', '#F15BB5', '#00BBF9'
    ];

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 15,
                    usePointStyle: true,
                    boxWidth: 12
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        let value = context.raw || 0;
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                        return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                    }
                }
            }
        }
    };

    if (currentChartType === 'pie') {
        accountsChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: names,
                datasets: [{
                    data: balances,
                    backgroundColor: backgroundColors.slice(0, names.length),
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: commonOptions
        });
    } else {
        accountsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: names,
                datasets: [{
                    label: 'Account Balances',
                    data: balances,
                    backgroundColor: backgroundColors.slice(0, names.length),
                    borderColor: backgroundColors.slice(0, names.length).map(color => 
                        color.replace(/[^,]\)$/, '1)')
                    ),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount ($)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Accounts'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }
}

// Cambiar tipo de gráfico
function switchChartType(type) {
    currentChartType = type;
    
    // Actualizar botones activos
    const chartButtons = document.querySelectorAll('.btn-chart');
    chartButtons.forEach(btn => {
        if (btn.getAttribute('data-chart-type') === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Recargar datos actuales
    const accounts = accountsCache.get(`accounts-${userId}`);
    if (accounts) {
        updateAccountsChart(JSON.parse(accounts));
    }
}

// Manejar creación de cuenta
async function handleAccountCreation() {
    const accountName = document.getElementById('accountName').value.trim();
    const accountBalance = document.getElementById('accountBalance').value;

    // Validación
    if (!accountName || !accountBalance) {
        showNotification('All fields are required', 'error', 'accountErrorMessage');
        return;
    }

    if (accountName.length < 2) {
        showNotification('Account name must be at least 2 characters', 'error', 'accountErrorMessage');
        return;
    }

    if (parseFloat(accountBalance) < 0) {
        showNotification('Balance cannot be negative', 'error', 'accountErrorMessage');
        return;
    }

    setLoadingState('addAccountButton', true);

    const result = await createAccount(accountName, accountBalance);

    setLoadingState('addAccountButton', false);

    if (result.ok) {
        showNotification('Account created successfully!', 'success', 'accountErrorMessage');
        
        // Limpiar formulario
        document.getElementById('addAccountForm').reset();
        
        // Limpiar cache y actualizar datos
        accountsCache.clear();
        await updateAccountsData();
        
        // Cerrar modal después de éxito
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addAccountModal'));
            if (modal) modal.hide();
        }, 1500);
        
    } else {
        showNotification(result.data.error || 'Error creating account', 'error', 'accountErrorMessage');
    }
}

// Actualizar todos los datos de cuentas
async function updateAccountsData() {
    try {
        const accounts = await getUserAccounts(userId);
        await displayTotalBalance();
        await displayAccountsTable();
        updateAccountsChart(accounts);
    } catch (error) {
        console.error('Error updating accounts data:', error);
    }
}

// Inicializar botones de tipo de gráfico
function initializeChartTypeButtons() {
    const chartTypeGroup = document.getElementById('chartTypeGroup');
    if (chartTypeGroup) {
        chartTypeGroup.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-chart');
            if (button) {
                const chartType = button.getAttribute('data-chart-type');
                switchChartType(chartType);
            }
        });
    }
}

// Limpiar cache periódicamente
setInterval(() => {
    accountsCache.clear();
    console.log('Accounts cache cleared');
}, 10 * 60 * 1000); // 10 minutos

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
    // Verificar autenticación
    if (!userId) {
        window.location.href = '/';
        return;
    }

    // Configurar interfaz
    greeting();
    updateCurrentDate();
    initializeChartTypeButtons();
    
    // Cargar datos iniciales
    try {
        await updateAccountsData();
    } catch (error) {
        console.error('Error during initialization:', error);
    }

    // Event listeners
    document.getElementById('logoutButton').addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
    });

    document.getElementById('addAccountButton').addEventListener('click', handleAccountCreation);

    // Enter key support para formulario
    document.getElementById('accountName')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAccountCreation();
        }
    });

    document.getElementById('accountBalance')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAccountCreation();
        }
    });

    // Limpiar mensajes de error al cerrar modal
    const modal = document.getElementById('addAccountModal');
    if (modal) {
        modal.addEventListener('hidden.bs.modal', () => {
            showNotification('', 'error', 'accountErrorMessage');
        });
    }
});