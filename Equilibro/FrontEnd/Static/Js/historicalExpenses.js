const userId = localStorage.getItem('userId');
const userName = localStorage.getItem('name');
let currentChartType = 'pie';
let expensesChartInstance = null;

// Cache para evitar llamadas repetidas a la API
const expensesCache = new Map();

function greeting() {
    const greetingElement = document.getElementById('userGreeting');
    if (greetingElement) {
        greetingElement.innerText = `Hello, ${userName || 'User'}!`;
    }
}

// Función para generar clave de cache
function getCacheKey(userId, month, year) {
    return `${userId}-${month}-${year}`;
}

async function filterExpensesByYearAndMonth(userId, month, year) {
    const cacheKey = getCacheKey(userId, month, year);

    // Verificar cache primero
    if (expensesCache.has(cacheKey)) {
        return expensesCache.get(cacheKey);
    }

    const payload = {
        user_id: userId,
        month: month,
        year: year
    };

    try {
        const response = await fetch('/expense/getExpensesByMonthAndYear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Total expenses:', result);

        // Guardar en cache
        expensesCache.set(cacheKey, result.data);
        return result.data;
    } catch (error) {
        console.error('Error getting expenses by month and year:', error);
        return null;
    }
}

async function applyExpenseFilter() {
    // Mostrar loading state
    const applyBtn = document.getElementById('applyFilterBtn');
    const originalText = applyBtn.innerHTML;
    applyBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Loading...';
    applyBtn.disabled = true;

    try {
        const month = document.getElementById('monthSelect').value;
        const year = document.getElementById('yearSelect').value;
        const currentDate = new Date();

        let selectedMonth = month;
        let selectedYear = year;

        // If month or year is not selected, use current month and year
        if (!month || !year) {
            selectedMonth = currentDate.getMonth() + 1;
            selectedYear = currentDate.getFullYear();

            // Actualizar los selects para reflejar la selección automática
            document.getElementById('monthSelect').value = selectedMonth;
            document.getElementById('yearSelect').value = selectedYear;
        }

        const result = await filterExpensesByYearAndMonth(userId, selectedMonth, selectedYear);

        // Actualizar UI - FIX: result es el objeto completo, necesitamos el total
        const expensesAmountElement = document.getElementById('expensesAmount');
        if (expensesAmountElement) {
            // Si result es un objeto con propiedad total, usar eso, sino mostrar el resultado directo
            const totalAmount = result && typeof result === 'object' && result.total !== undefined
                ? result.total
                : (result || '0.00');
            expensesAmountElement.textContent = `$${parseFloat(totalAmount).toFixed(2)}`;
        }

        // Actualizar período
        const expensePeriodElement = document.getElementById('expensePeriod');
        if (expensePeriodElement) {
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            expensePeriodElement.textContent = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
        }

        await showExpensesHistory(userId, selectedMonth, selectedYear);
    } catch (error) {
        console.error('Error applying filter:', error);
        showNotification('Error applying filter', 'error');
    } finally {
        // Restaurar estado del botón
        applyBtn.innerHTML = originalText;
        applyBtn.disabled = false;
    }
}

async function getExpensesDetailsByMonthAndYear(userId, month, year) {
    const cacheKey = `details-${getCacheKey(userId, month, year)}`;

    // Verificar cache
    if (expensesCache.has(cacheKey)) {
        return expensesCache.get(cacheKey);
    }

    const payload = {
        user_id: userId,
        month: month,
        year: year
    };

    try {
        const response = await fetch('/expense/getExpensesDetailsByMonthAndYear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Expenses details:', result);

        // Guardar en cache
        expensesCache.set(cacheKey, result.data);
        return result.data;
    } catch (error) {
        console.error('Error getting expenses details:', error);
        return null;
    }
}

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

function showNotification(message, type = 'info') {
    // Implementar un sistema de notificaciones simple
    console.log(`${type.toUpperCase()}: ${message}`);
    // Podrías usar Toastify, SweetAlert, o crear tu propio sistema
}

async function showExpensesHistory(userId, month, year) {
    try {
        const expenses = await getExpensesDetailsByMonthAndYear(userId, month, year);

        if (!expenses || expenses.length === 0) {
            console.log('No expenses to show.');
            const tbody = document.getElementById('expensesHistoryTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No expenses found for the selected period</td></tr>';
            }
            updateExpensesChart([]);
            return;
        }

        // Sort by date (most recent first)
        expenses.sort((a, b) => new Date(b[4]) - new Date(a[4]));

        const tbody = document.getElementById('expensesHistoryTableBody');
        if (!tbody) {
            console.error('Table body element not found');
            return;
        }

        tbody.innerHTML = '';

        expenses.forEach(expense => {
            const [description, amount, account, category, date] = expense;
            const formattedDate = formatDate(date);

            // Colors by type
            let amountColor = 'red';
            if (category === 'Movement') amountColor = 'blue';
            if (category === 'Income') amountColor = 'green';

            const row = `
                <tr>
                    <td class="text-truncate" style="max-width: 150px;" title="${description}">${description}</td>
                    <td style="color: ${amountColor}; font-weight: bold;">$${parseFloat(amount).toFixed(2)}</td>
                    <td>${account}</td>
                    <td>${category}</td>
                    <td>${formattedDate}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // Update chart with the expenses data
        updateExpensesChart(expenses);

    } catch (error) {
        console.error('Error showing expenses history:', error);
        showNotification('Error loading expenses history', 'error');
    }
}

function prepareChartData(expenses) {
    const categoryTotals = {};
    let totalExpenses = 0;

    expenses.forEach(expense => {
        const [description, amount, account, category, date] = expense;

        // Solo procesar gastos (excluir movimientos e ingresos)
        if (category !== 'Movement' && category !== 'Income') {
            const amountNum = parseFloat(amount);
            if (categoryTotals[category]) {
                categoryTotals[category] += amountNum;
            } else {
                categoryTotals[category] = amountNum;
            }
            totalExpenses += amountNum;
        }
    });

    return {
        categories: Object.keys(categoryTotals),
        amounts: Object.values(categoryTotals),
        total: totalExpenses
    };
}

function updateExpensesChart(expenses) {
    const canvas = document.getElementById('expensesChart');
    if (!canvas) {
        console.error('Chart canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');

    // Destruir el gráfico anterior si existe
    if (expensesChartInstance) {
        expensesChartInstance.destroy();
        expensesChartInstance = null;
    }

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!expenses || expenses.length === 0) {
        // Mostrar mensaje cuando no hay datos
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No expenses data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    const chartData = prepareChartData(expenses);
    const { categories, amounts, total } = chartData;

    if (categories.length === 0) {
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No categorized expenses', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Colores para las categorías
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
                    label: function (context) {
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
        expensesChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    data: amounts,
                    backgroundColor: backgroundColors.slice(0, categories.length),
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: commonOptions
        });
    } else {
        expensesChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Expenses by Category',
                    data: amounts,
                    backgroundColor: backgroundColors.slice(0, categories.length),
                    borderColor: backgroundColors.slice(0, categories.length).map(color =>
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
                            callback: function (value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Categories'
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
    const month = document.getElementById('monthSelect')?.value;
    const year = document.getElementById('yearSelect')?.value;
    const currentDate = new Date();

    let selectedMonth = month || currentDate.getMonth() + 1;
    let selectedYear = year || currentDate.getFullYear();

    showExpensesHistory(userId, selectedMonth, selectedYear);
}

// Limpiar cache periódicamente
setInterval(() => {
    expensesCache.clear();
    console.log('Cache cleared');
}, 5 * 60 * 1000); // 5 minutos

// Inicialización mejorada
function initializeYearSelect() {
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '<option value="">Select Year</option>';
        for (let year = currentYear - 2; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }
}

function initializeMonthSelect() {
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) {
        const currentMonth = new Date().getMonth() + 1;
        monthSelect.value = currentMonth;
    }
}

// Event listeners para botones de tipo de gráfico
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

document.addEventListener("DOMContentLoaded", async () => {
    // Verificar que el usuario está autenticado
    if (!userId) {
        window.location.href = '/';
        return;
    }

    initializeYearSelect();
    initializeMonthSelect();
    initializeChartTypeButtons();
    greeting();

    try {
        await applyExpenseFilter();
    } catch (error) {
        console.error('Error during initialization:', error);
        showNotification('Error loading expenses data', 'error');
    }

    // Event listeners
    const applyBtn = document.getElementById('applyFilterBtn');

    if (applyBtn) {
        applyBtn.addEventListener('click', async () => {
            await applyExpenseFilter();
        });
    }
    // Event listener para logout
    document.getElementById('logoutButton').addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
    });
});