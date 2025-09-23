const socket = io();
const user_id = localStorage.getItem('user_id');

socket.on('user_halls', (halls) => {
    const sidebar = document.getElementById('sidebar-halls');
    sidebar.innerHTML = '';

    halls.forEach(hall => {
        const button = document.createElement('button');
        button.textContent = hall.name;
        button.dataset.hallId = hall.id;

        button.className = "w-full text-left px-3 py-2 rounded-md hover:bg-gray-200 focus:outline-none";

        button.addEventListener('click', () => {
            document.querySelectorAll('#sidebar-halls button').forEach(b => {
                b.classList.remove('bg-gray-300');
            });
            button.classList.add('bg-gray-300');
            
            loadHallMessages(hall.id);
        });
        sidebar.appendChild(button);
    });
});

async function loadHallMessages(hallId) {
    try {
        const response = await fetch(`/chat/messages/${hallId}`);
        const data = await response.json();
        const chatArea = document.getElementById('chat-area');
        chatArea.innerHTML = '';
        
        data.messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'mb-2';
            div.innerHTML = `
                <span class="font-bold">${msg.username}</span>:
                <span>${msg.content}</span>
                <span class="text-xs text-gray-400 ml-2">${new Date(msg.created_at).toLocaleTimeString()}</span>
            `;
            chatArea.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// ------------------------------
// Funciones para usuarios online y ping
// ------------------------------
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
        userList.innerHTML = '';
        data.online_users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user.username;
            userList.appendChild(li);
        });
    })
    .catch(error => console.error('Fetch online users error:', error));
}

// ------------------------------
// Ejecutar al cargar página y cada cierto tiempo
// ------------------------------
window.onload = () => {
    fetchOnlineUsers();
    ping();
    socket.emit('get_user_halls', { user_id: user_id });
};
setInterval(fetchOnlineUsers, 30000); // actualizar cada 30s
setInterval(ping, 60000);             // enviar ping cada 60s
 