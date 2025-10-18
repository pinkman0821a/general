const userId = localStorage.getItem('userId');
const userName = localStorage.getItem('name');

// Cache para datos
const dashboardCache = {
    get: (key) => sessionStorage.getItem(key),
    set: (key, value) => sessionStorage.setItem(key, JSON.stringify(value)),
    clear: () => sessionStorage.clear()
};

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

// Función para formatear fechas
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month} ${hours}:${minutes}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
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
    if (greetingElement) {
        greetingElement.textContent = `Hello, ${userName || 'User'}!`;
    }
}

// Obtener cuentas del usuario
async function getUserAccounts(userId) {
    const cacheKey = `accounts-${userId}`;
    const cached = dashboardCache.get(cacheKey);

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
        dashboardCache.set(cacheKey, result.data);
        return result.data;
    } catch (error) {
        console.error('Error fetching accounts:', error);
        showNotification('Error loading accounts', 'error', 'expenseErrorMessage');
        return [];
    }
}

// Obtener categorías del usuario
async function getUserCategories(userId) {
    const cacheKey = `categories-${userId}`;
    const cached = dashboardCache.get(cacheKey);

    if (cached) {
        return JSON.parse(cached);
    }

    const payload = { user_id: userId };

    try {
        const response = await fetch('/expense/getUserCategories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error getting categories');
        }

        const result = await response.json();
        console.log('User categories:', result);

        // Guardar en cache
        dashboardCache.set(cacheKey, result.data);
        return result.data;
    } catch (error) {
        console.error('Error fetching categories:', error);
        showNotification('Error loading categories', 'error', 'expenseErrorMessage');
        return [];
    }
}

// Llenar selects con opciones
function fillSelect(items, elementId, placeholder = 'Select an option...') {
    const select = document.getElementById(elementId);
    if (!select) return;

    // Limpiar opciones anteriores
    select.innerHTML = `<option value="" selected disabled>${placeholder}</option>`;

    // Agregar opciones
    items.forEach(item => {
        const id = item[0];
        const name = item[1];

        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        select.appendChild(option);
    });
}

// Crear gasto
async function createExpense(amount, description, accountId, categoryId, userId) {
    const payload = {
        value: amount,
        description: capitalize(description),
        account_id: accountId,
        category_id: categoryId,
        user_id: userId
    };

    try {
        const response = await fetch('/expense/createExpense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        return { ok: response.ok, data: result };
    } catch (error) {
        console.error('Error creating expense:', error);
        return { ok: false, data: { error: "Error creating expense." } };
    }
}

// Manejar creación de gasto
async function handleExpenseCreation() {
    const amount = document.getElementById('expenseAmount').value.trim();
    const description = document.getElementById('expenseDescription').value.trim();
    const accountId = document.getElementById('expenseAccountSelect').value;
    const categoryId = document.getElementById('expenseCategorySelect').value;

    // Validación
    if (!amount || !description || !accountId || !categoryId) {
        showNotification('All fields are required', 'error', 'expenseErrorMessage');
        return;
    }

    if (parseFloat(amount) <= 0) {
        showNotification('Amount must be greater than 0', 'error', 'expenseErrorMessage');
        return;
    }

    setLoadingState('addExpenseButton', true);

    const result = await createExpense(amount, description, accountId, categoryId, userId);

    setLoadingState('addExpenseButton', false);

    if (result.ok) {
        showNotification('Expense created successfully!', 'success', 'expenseErrorMessage');

        // Limpiar formulario
        document.getElementById('addExpenseForm').reset();

        // Limpiar cache y actualizar datos
        dashboardCache.clear();
        await updateDashboardData();

        // Cerrar modal después de éxito
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
            if (modal) modal.hide();
        }, 1500);

    } else {
        showNotification(result.data.error || 'Error creating expense', 'error', 'expenseErrorMessage');
    }
}

// Obtener gastos del usuario
async function getExpenses(userId) {
    const cacheKey = `expenses-${userId}`;
    const cached = dashboardCache.get(cacheKey);

    if (cached) {
        return JSON.parse(cached);
    }

    const payload = { user_id: userId };

    try {
        const response = await fetch('/expense/getUserExpenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error getting expenses');
        }

        const result = await response.json();
        console.log('User expenses:', result);

        // Guardar en cache
        dashboardCache.set(cacheKey, result.data);
        return result.data;
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return [];
    }
}

// Mostrar gastos en la tabla
async function showExpenses(userId) {
    try {
        const expenses = await getExpenses(userId);
        const tbody = document.getElementById('expensesTableBody');

        if (!tbody) {
            console.error('Table body element not found');
            return;
        }

        if (!expenses || expenses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-receipt display-4"></i>
                        <p class="mt-2">No transactions yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Ordenar por fecha (más reciente primero)
        expenses.sort((a, b) => new Date(b[1]) - new Date(a[1]));

        // Mostrar solo los últimos 10 registros
        const recentExpenses = expenses.slice(0, 10);

        tbody.innerHTML = '';

        recentExpenses.forEach(expense => {
            const [amount, date, description, account, category] = expense;
            const formattedDate = formatDate(date);

            // Colores por tipo
            let amountColor = 'red';
            if (category === 'Movement') amountColor = 'blue';
            if (category === 'Income') amountColor = 'green';

            const row = `
                <tr>
                    <td class="text-truncate" style="max-width: 120px;" title="${description}">${description}</td>
                    <td style="color: ${amountColor}; font-weight: bold;">$${parseFloat(amount).toFixed(2)}</td>
                    <td>${account}</td>
                    <td>${category}</td>
                    <td>${formattedDate}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });

    } catch (error) {
        console.error('Error showing expenses:', error);
        const tbody = document.getElementById('expensesTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger py-4">
                        Error loading transactions
                    </td>
                </tr>
            `;
        }
    }
}

// Mover dinero entre cuentas
async function moveMoney(amount, accountIdA, accountIdB, userId) {
    const payload = {
        user_id: userId,
        account_id_a: accountIdA,
        account_id_b: accountIdB,
        amount: amount
    };

    try {
        const response = await fetch('/account/makeMovement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error creating movement');
        }

        const result = await response.json();
        console.log('Movement result:', result);
        return { ok: true, data: result };
    } catch (error) {
        console.error('Error moving money:', error);
        return { ok: false, data: { error: "Error moving money." } };
    }
}

// Manejar movimiento de dinero
async function handleMoneyMovement() {
    const amount = document.getElementById('moveAmount').value.trim();
    const accountIdA = document.getElementById('fromAccountSelect').value;
    const accountIdB = document.getElementById('toAccountSelect').value;

    // Validación
    if (!amount || !accountIdA || !accountIdB) {
        showNotification('All fields are required', 'error', 'moveMoneyErrorMessage');
        return;
    }

    if (parseFloat(amount) <= 0) {
        showNotification('Amount must be greater than 0', 'error', 'moveMoneyErrorMessage');
        return;
    }

    if (accountIdA === accountIdB) {
        showNotification('Source and destination accounts must be different', 'error', 'moveMoneyErrorMessage');
        return;
    }

    setLoadingState('addMovementButton', true);

    const result = await moveMoney(amount, accountIdA, accountIdB, userId);

    setLoadingState('addMovementButton', false);

    if (result.ok) {
        showNotification('Money moved successfully!', 'success', 'moveMoneyErrorMessage');

        // Limpiar formulario
        document.getElementById('moveMoneyForm').reset();

        // Limpiar cache y actualizar datos
        dashboardCache.clear();
        await updateDashboardData();

        // Cerrar modal después de éxito
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('moveMoneyModal'));
            if (modal) modal.hide();
        }, 1500);

    } else {
        showNotification(result.data.error || 'Error moving money', 'error', 'moveMoneyErrorMessage');
    }
}

// Agregar ingreso
async function addIncome(userId, accountId, amount) {
    const payload = {
        user_id: userId,
        account_id: accountId,
        amount: amount
    };

    try {
        const response = await fetch('/account/makeEntry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error creating income');
        }

        const result = await response.json();
        console.log('Income result:', result);
        return { ok: true, data: result };
    } catch (error) {
        console.error('Error adding income:', error);
        return { ok: false, data: { error: "Error adding income." } };
    }
}

// Manejar adición de ingreso
async function handleIncomeAddition() {
    const amount = document.getElementById('incomeAmount').value.trim();
    const accountId = document.getElementById('incomeAccountSelect').value;

    // Validación
    if (!amount || !accountId) {
        showNotification('All fields are required', 'error', 'incomeErrorMessage');
        return;
    }

    if (parseFloat(amount) <= 0) {
        showNotification('Amount must be greater than 0', 'error', 'incomeErrorMessage');
        return;
    }

    setLoadingState('addIncomeButton', true);

    const result = await addIncome(userId, accountId, amount);

    setLoadingState('addIncomeButton', false);

    if (result.ok) {
        showNotification('Income added successfully!', 'success', 'incomeErrorMessage');

        // Limpiar formulario
        document.getElementById('addIncomeForm').reset();

        // Limpiar cache y actualizar datos
        dashboardCache.clear();
        await updateDashboardData();

        // Cerrar modal después de éxito
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addIncomeModal'));
            if (modal) modal.hide();
        }, 1500);

    } else {
        showNotification(result.data.error || 'Error adding income', 'error', 'incomeErrorMessage');
    }
}

// Obtener balance total
async function getTotalBalance(userId) {
    const cacheKey = `balance-${userId}`;
    const cached = dashboardCache.get(cacheKey);

    if (cached) {
        return JSON.parse(cached);
    }

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
        console.log('Total balance:', result);

        // Guardar en cache
        dashboardCache.set(cacheKey, result);
        return result;
    } catch (error) {
        console.error('Error fetching total balance:', error);
        return { data: '0.00' };
    }
}

// Mostrar balance total
async function printTotalBalance() {
    const result = await getTotalBalance(userId);
    const balance = result?.data ?? '0.00';
    const element = document.getElementById('totalBalance');
    if (element) {
        element.textContent = `$${parseFloat(balance).toFixed(2)}`;
    }
}

// Obtener gastos mensuales
async function getMonthlyExpenses(userId) {
    const cacheKey = `monthly-${userId}`;
    const cached = dashboardCache.get(cacheKey);

    if (cached) {
        return JSON.parse(cached);
    }

    const payload = { user_id: userId };

    try {
        const response = await fetch('/expense/monthlyExpenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Error getting monthly expenses');
        }

        const result = await response.json();
        console.log('Monthly expenses:', result);

        // Guardar en cache
        dashboardCache.set(cacheKey, result);
        return result;
    } catch (error) {
        console.error('Error fetching monthly expenses:', error);
        return { data: '0.00' };
    }
}

// Mostrar gastos mensuales
async function printMonthlyExpenses() {
    const result = await getMonthlyExpenses(userId);
    const expenses = result?.data ?? '0.00';
    const element = document.getElementById('monthlyExpenses');
    if (element) {
        element.textContent = `$${parseFloat(expenses).toFixed(2)}`;
    }
}

// Actualizar todos los datos del dashboard
async function updateDashboardData() {
    try {
        await Promise.all([
            printTotalBalance(),
            printMonthlyExpenses(),
            showExpenses(userId)
        ]);
    } catch (error) {
        console.error('Error updating dashboard data:', error);
    }
}

// Limpiar cache periódicamente
setInterval(() => {
    dashboardCache.clear();
    console.log('Dashboard cache cleared');
}, 10 * 60 * 1000); // 10 minutos

// Función de logout mejorada
async function logout() {
    try {
        // Opcional: Hacer llamada al servidor para invalidar el token
        await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.log('Logout request failed, continuing with client-side cleanup');
    } finally {
        // Limpiar TODO el localStorage
        localStorage.clear();
        sessionStorage.clear();

        // Redirigir forzadamente al login
        window.location.href = '/';
    }
}

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
    // Verificar autenticación
    if (!userId) {
        window.location.href = '/';
        return;
    }

    // Inicializar componentes
    greeting();
    updateCurrentDate();

    // Cargar datos iniciales
    try {
        const [accounts, categories] = await Promise.all([
            getUserAccounts(userId),
            getUserCategories(userId)
        ]);

        // Llenar selects
        fillSelect(accounts, 'expenseAccountSelect', 'Select account...');
        fillSelect(accounts, 'fromAccountSelect', 'Select source account...');
        fillSelect(accounts, 'toAccountSelect', 'Select destination account...');
        fillSelect(accounts, 'incomeAccountSelect', 'Select account...');
        fillSelect(categories, 'expenseCategorySelect', 'Select category...');

        // Actualizar datos del dashboard
        await updateDashboardData();

    } catch (error) {
        console.error('Error during initialization:', error);
    }

    // Event listeners
    document.getElementById('addExpenseButton').addEventListener('click', handleExpenseCreation);
    document.getElementById('addMovementButton').addEventListener('click', handleMoneyMovement);
    document.getElementById('addIncomeButton').addEventListener('click', handleIncomeAddition);

    // Limpiar mensajes de error al cerrar modales
    const modals = ['addExpenseModal', 'moveMoneyModal', 'addIncomeModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('hidden.bs.modal', () => {
                const errorId = modalId.replace('Modal', 'ErrorMessage');
                showNotification('', 'error', errorId);
            });
        }
    });
    document.getElementById('logoutButton').addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
    });
});