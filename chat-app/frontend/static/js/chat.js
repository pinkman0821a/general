function ping() {

    const token = localStorage.getItem('token');
    const user_id = localStorage.getItem('user_id');
    if (!token) {
        console.error('No token found in localStorage.');
        return;
    }

    fetch('/chat/ping', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id:user_id })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error failed: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log('Ping successful:', data);
    })
    .catch(error => {
        console.error('Error during ping:', error);
    });
}

function fetchOnlineUsers() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found in localStorage.');
        return;
    }
    fetch('/chat/online-users', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error fetching online users: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log('Online users:', data.online_users);

        const userList = document.getElementById('userList');
        userList.innerHTML = '';
        data.online_users.forEach(user => {
            const listItem = document.createElement('li');
            listItem.textContent = user.username;
            userList.appendChild(listItem);
        });
    })
    .catch(error => {
        console.error('Error during fetching online users:', error);
    });
}

setInterval(fetchOnlineUsers,30000);
setInterval(ping,60000);
window.onload = fetchOnlineUsers;
window.onload = ping;
