const socket = io();
const user_id = localStorage.getItem('user_id');
const username = localStorage.getItem('username');
let currentHallId = null;

socket.on('user_halls', (halls) => {
    renderHalls(halls);
});

socket.on('new_message', (msg) => {
    if (msg.hall_id == currentHallId) {
        addMessageToChat(msg);
    }
});

window.onload = () => {
    fetchOnlineUsers();
    ping();
    socket.emit('get_user_halls', { user_id: user_id });
    setupSendMessage();
};

setInterval(fetchOnlineUsers, 30000);
setInterval(ping, 60000);
