const userId = localStorage.getItem('userId');
const userName = localStorage.getItem('name');

function greeting() {
    document.getElementById('userGreeting').innerText = `Hello, ${userName}!`;
}

async function filterExpensesByYearAndMonth(userId, month, year) {
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
            throw new Error('Error getting expenses by month and year');
        }

        const result = await response.json();
        console.log(result);
        return result.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function applyExpenseFilter() {
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;
    const currentDate = new Date();

    let selectedMonth = month;
    let selectedYear = year;

    // If month or year is not selected, use current month and year
    if (!month || !year) {
        selectedMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
        selectedYear = currentDate.getFullYear();
    }

    const result = await filterExpensesByYearAndMonth(userId, selectedMonth, selectedYear); 
    document.getElementById('expensesAmount').textContent = result;
    await showExpensesHistory(userId, selectedMonth, selectedYear);
}   

async function getExpensesDetailsByMonthAndYear(userId, month, year) {
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
            throw new Error('Error getting expenses details');
        }

        const result = await response.json();
        console.log(result);
        return result.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${hours}:${minutes}`;
}

async function showExpensesHistory(userId, month, year) {
    try {
        const expenses = await getExpensesDetailsByMonthAndYear(userId, month, year);

        if (!expenses || expenses.length === 0) {
            console.log('No expenses to show.');
            const tbody = document.getElementById('expensesHistoryTableBody');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No expenses found for the selected period</td></tr>';
            updateExpensesChart([]); // Clear chart when no data
            return;
        }

        // Sort by date (most recent first)
        expenses.sort((a, b) => new Date(b[4]) - new Date(a[4]));

        const tbody = document.getElementById('expensesHistoryTableBody');
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
                    <td>${description}</td>
                    <td style="color: ${amountColor}; font-weight: bold;">${amount}</td>
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
    }
}

function updateExpensesChart(expenses) {
    const ctx = document.getElementById('expensesChart').getContext('2d');
    
    // Destruir el gráfico anterior si existe
    if (window.expensesChartInstance) {
        window.expensesChartInstance.destroy();
    }

    if (!expenses || expenses.length === 0) {
        // Mostrar mensaje cuando no hay datos
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No expenses data available', 200, 120);
        return;
    }

    // Agrupar gastos por categoría y sumar los valores
    const categoryTotals = {};
    
    expenses.forEach(expense => {
        const [description, amount, account, category, date] = expense;
        
        // Solo procesar gastos (excluir movimientos e ingresos)
        if (category !== 'Movement' && category !== 'Income') {
            if (categoryTotals[category]) {
                categoryTotals[category] += parseFloat(amount);
            } else {
                categoryTotals[category] = parseFloat(amount);
            }
        }
    });

    // Preparar datos para el gráfico
    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);

    if (categories.length === 0) {
        // Mostrar mensaje cuando no hay gastos por categoría
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No categorized expenses', 200, 120);
        return;
    }

    // Colores para las categorías
    const backgroundColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ];

    // Crear el gráfico circular
    window.expensesChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: backgroundColors.slice(0, categories.length),
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    greeting();
    await applyExpenseFilter();
    document.getElementById('applyFilterBtn').addEventListener('click', async () => {
        await applyExpenseFilter();
    });
    
});