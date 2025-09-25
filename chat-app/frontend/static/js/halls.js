function renderHalls(halls) {
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
            
            currentHallId = hall.id;
            joinHall(currentHallId);
            loadHallMessages(currentHallId);
        });
        sidebar.appendChild(button);
    });
}

function joinHall(hallId) {
    socket.emit('join_hall', { hall_id: hallId });
}

async function loadHallMessages(hallId) {
    try {
        const response = await fetch(`/chat/messages/${hallId}`);
        const data = await response.json();
        const chatArea = document.getElementById('chat-area');
        chatArea.innerHTML = '';
        
        data.messages.forEach(msg => {
            addMessageToChat(msg);
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}
