function addMessageToChat(msg) {
    const chatArea = document.getElementById('chat-area');
    const div = document.createElement('div');

    const currentUserId = localStorage.getItem('user_id');
    const isOwnMessage = msg.sender_id == currentUserId;

    div.className = `mb-2 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`;

    // 👇 Si el mensaje está borrado, mostrar en cursiva
    const messageContent = msg.deleted == 1 
        ? `<em class="text-gray-400">Mensaje eliminado</em>` 
        : msg.content;

    div.innerHTML = `
        <div class="p-2 rounded-lg max-w-xs relative ${
            isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
        }">
            <span class="font-bold">${msg.username || username}</span>:
            <span>${messageContent}</span>
            <span class="text-xs text-gray-400 ml-2 block">${formatDate(msg.created_at)}</span>

            ${
                isOwnMessage && msg.deleted == 0
                    ? `
                        <button class="absolute top-1 right-1 text-white menu-btn">⋮</button>
                        <div class="hidden absolute top-6 right-1 bg-white text-black border rounded shadow-md z-10 w-32 menu-dropdown">
                            <button class="w-full text-left px-4 py-2 hover:bg-gray-100 delete-btn">🗑️ Borrar</button>
                        </div>
                    `
                    : ''
            }
        </div>
    `;

    chatArea.appendChild(div);

    // 👇 Forzar scroll al final
    requestAnimationFrame(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
    });

    // Solo activar menú si es tuyo y no está borrado
    if (isOwnMessage && msg.deleted == 0) {
        const menuBtn = div.querySelector('.menu-btn');
        const dropdown = div.querySelector('.menu-dropdown');
        const deleteBtn = div.querySelector('.delete-btn');

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // evita cierre al hacer clic dentro
            dropdown.classList.toggle('hidden');
        });

        // Acción borrar con API
        deleteBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/chat/delete-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message_id: msg.id })
                });

                const result = await response.json();
                if (result.success) {
                    // 👇 Cambiar el contenido a "Mensaje eliminado" en cursiva
                    const contentSpan = div.querySelector('span:nth-child(2)');
                    contentSpan.outerHTML = `<em class="text-gray-400">Mensaje eliminado</em>`;
                    
                    // ocultar menú
                    dropdown.classList.add('hidden');
                } else {
                    alert("Error al borrar: " + result.error);
                }
            } catch (error) {
                console.error("Error borrando mensaje:", error);
            }
        });

        // Cerrar menú si haces clic fuera
        document.addEventListener('click', (e) => {
            if (!div.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }
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
