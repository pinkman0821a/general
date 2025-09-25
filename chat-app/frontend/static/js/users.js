function ping() {
    const token = localStorage.getItem('token');
    const user_id = localStorage.getItem('user_id');
    if (!token) return;

    fetch('/chat/ping', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: user_id })
    })
    .then(response => response.json())
    .then(data => console.log('Ping successful:', data))
    .catch(error => console.error('Ping error:', error));
}

function fetchOnlineUsers() {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/chat/online-users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        const userList = document.getElementById('user-list');
        userList.innerHTML = '';
        data.online_users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user.username;
            userList.appendChild(li);
        });
    })
    .catch(error => console.error('Fetch online users error:', error));
}
