const userId = localStorage.getItem('userId');
const name = localStorage.getItem('name');

function greeting() {
    document.getElementById('greeting').innerText = `Hello, ${name}!`;
}

function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

async function createAccount(accountName, initialBalance) {
    
    const data = {
        name: capitalize(accountName),
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
            console.log(result);
        } else {
            const error = await response.json();
            console.error(error);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

async function createCategory(categoryName) {
    
    const data = {
        name: capitalize(categoryName),
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
            console.log(result);
        } else {
            const error = await response.json();
            console.error(error);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

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
            console.log(result);
        } else {
            const error = await response.json();
            console.error(error);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    greeting();
    document.getElementById("submitButton").addEventListener("click", async (event) => {
        event.preventDefault();
        const accountName = document.getElementById('accountName').value;
        const initialBalance = document.getElementById('accountBalance').value;
        await createAccount(accountName, initialBalance);
        const accountName2 = "Cash";
        const initialBalance2 = document.getElementById('cashAmount').value;
        await createAccount(accountName2, initialBalance2);
        const categoryName = document.getElementById('category1').value;
        await createCategory(categoryName);
        const categoryName2 = document.getElementById('category2').value;
        await createCategory(categoryName2);
        await formCompleted();
        window.location.href = '/dashBoard';
    });
});