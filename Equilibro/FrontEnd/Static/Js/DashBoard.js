const userId = localStorage.getItem('userId');
const userName = localStorage.getItem('name');

function greeting() {
    document.getElementById('greeting').innerText = `Hello, ${userName}!`;
}

async function getUserAccounts(userId) {
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
        console.log(result);
        fillSelect(result.data, 'expenseAccountSelect');
        fillSelect(result.data, 'fromAccountSelect');
        fillSelect(result.data, 'toAccountSelect');
        fillSelect(result.data, 'incomeAccountSelect');
        return result.data;
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function getUserCategories(userId) {
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
        console.log(result);
        fillSelect(result.data, 'expenseCategorySelect');
        return result.data;
    } catch (error) {
        console.error(error);
        return [];
    }
}

function fillSelect(accounts, elementId) {
    const select = document.getElementById(elementId);

    // Clear previous options
    select.innerHTML = '<option selected disabled>Select an account...</option>';

    // Loop through accounts and add them as <option>
    accounts.forEach(account => {
        const id = account[0];
        const name = account[1];

        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;

        select.appendChild(option);
    });
}

function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

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
        console.error(error);
        return { ok: false, data: { error: "Error creating expense." } };
    }
}

async function handleExpenseCreation() {
    const amount = document.getElementById('expenseAmount').value.trim();
    const description = document.getElementById('expenseDescription').value.trim();
    const accountId = document.getElementById('expenseAccountSelect').value;
    const categoryId = document.getElementById('expenseCategorySelect').value;

    const message = document.getElementById('expenseErrorMessage');

    // ✅ Validation before sending
    if (!amount || !description || !accountId || !categoryId) {
        message.innerText = "⚠️ All fields are required.";
        message.style.color = "orange";
        setTimeout(() => (message.innerText = ''), 3000);
        return;
    }

    const result = await createExpense(amount, description, accountId, categoryId, userId);

    if (result.ok) {
        message.innerText = "✅ Expense created successfully.";
        message.style.color = "green";

        // Clear form but do NOT close modal
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseDescription').value = '';
        document.getElementById('expenseAccountSelect').value = '';
        document.getElementById('expenseCategorySelect').value = '';

        await showExpenses(userId);
    } else {
        message.innerText = `❌ ${result.data.error || "Unknown error."}`;
        message.style.color = "red";
    }

    setTimeout(() => {
        message.innerText = '';
    }, 3000);
}

async function getExpenses(userId) {
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
        console.log(result);
        return result.data;
    } catch (error) {
        console.error(error);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${hours}:${minutes}`;
}

async function showExpenses(userId) {
    try {
        const expenses = await getExpenses(userId);

        if (!expenses || expenses.length === 0) {
            console.log('No expenses to show.');
            return;
        }

        // Sort by date (most recent first)
        expenses.sort((a, b) => new Date(b[1]) - new Date(a[1]));

        const tbody = document.getElementById('expensesTableBody');
        tbody.innerHTML = '';

        expenses.forEach(expense => {
            const [amount, date, description, account, category] = expense;
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

    } catch (error) {
        console.error('Error showing expenses:', error);
    }
}

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
        console.log(result);
    } catch (error) {
        console.error(error);
    }
}

function movementSuccess() {
    const message = document.getElementById('moveMoneyErrorMessage');
    message.innerText = "Movement created successfully.";
    message.style.color = "green";
    document.getElementById('moveAmount').value = '';
    document.getElementById('fromAccountSelect').value = '';
    document.getElementById('toAccountSelect').value = '';
    showExpenses(userId);

    const closeButton = document.querySelector('.btn-close[data-bs-dismiss="modal"]');
    if (closeButton) {
        closeButton.click();
    }

    setTimeout(() => {
        document.getElementById('moveMoneyErrorMessage').innerText = '';
    }, 3000);
}

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
        console.log(result);
    } catch (error) {
        console.error(error);
    }
}

function incomeSuccess() {
    const message = document.getElementById('incomeErrorMessage');
    message.innerText = "Income created successfully.";
    message.style.color = "green";
    document.getElementById('incomeAmount').value = '';
    document.getElementById('incomeAccountSelect').value = '';
    showExpenses(userId);

    const closeButton = document.querySelector('.btn-close[data-bs-dismiss="modal"]');
    if (closeButton) {
        closeButton.click();
    }

    setTimeout(() => {
        document.getElementById('incomeErrorMessage').innerText = '';
    }, 3000);
}

async function getTotalBalance(userId) {
    const payload = {
        user_id: userId
    };

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
        console.log(result);
        return result
    } catch (error) {
        console.error(error);
    }
}

async function printTotalBalance() {
    const result = await getTotalBalance(userId);
    const balance = result?.data ?? '0';
    const element = document.getElementById('totalBalance');
    element.innerText = `Total Balance: ${balance}`;
    element.style.fontWeight = 'bold';
}

async function getMonthlyExpenses(userId) {
    const payload = {
        user_id: userId
    };

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
        console.log(result);
        return result
    } catch (error) {
        console.error(error);
    }
}

async function printMonthlyExpenses() {
    const result = await getMonthlyExpenses(userId);
    const expenses = result?.data ?? '0';
    const element = document.getElementById('monthlyExpenses');
    element.innerText = `Monthly Expenses: ${expenses}`;
    element.style.fontWeight = 'bold';
}

document.addEventListener("DOMContentLoaded", async () => {
    greeting();
    await printTotalBalance();
    await printMonthlyExpenses();
    await getUserAccounts(userId);
    await getUserCategories(userId);
    await showExpenses(userId);
    
    document.getElementById('addExpenseButton').addEventListener('click', async () => {
        await handleExpenseCreation();  
        await printTotalBalance(); 
        await printMonthlyExpenses();  
    });
    
    document.getElementById('addMovementButton').addEventListener('click', async () => {
        const amount = document.getElementById('moveAmount').value;
        const accountIdA = document.getElementById('fromAccountSelect').value;
        const accountIdB = document.getElementById('toAccountSelect').value;
        await moveMoney(amount, accountIdA, accountIdB, userId);
        movementSuccess();
    });
    
    document.getElementById('addIncomeButton').addEventListener('click', async () => {
        const amount = document.getElementById('incomeAmount').value;
        const accountId = document.getElementById('incomeAccountSelect').value;
        await addIncome(userId, accountId, amount);
        incomeSuccess();
        await printTotalBalance();
    });

    document.getElementById('historicalExpenses').addEventListener('click', async () => {
        window.location.href = '/historicalExpenses';
    });
});