function addMessageToChat(msg) {
    const chatArea = document.getElementById('chat-area');
    const div = document.createElement('div');
    div.className = 'mb-2';
    div.innerHTML = `
        <span class="font-bold">${msg.username || username}</span>:
        <span>${msg.content}</span>
        <span class="text-xs text-gray-400 ml-2">${formatDate(msg.created_at)}</span>
    `;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function setupSendMessage() {
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

    function send() {
        const content = messageInput.value.trim();
        if (content && currentHallId) {
            socket.emit('send_message', {
                sender_id: user_id,
                hall_id: currentHallId,
                content: content
            });
            messageInput.value = '';
        }
    }

    sendBtn.addEventListener('click', send);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            send();
        }
    });
}
