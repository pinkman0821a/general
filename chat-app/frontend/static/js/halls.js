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

        loadHallInfo(hallId)
        // Agregar todos los mensajes
        data.messages.forEach(msg => {
            addMessageToChat(msg);
        });

        // 👇 Esperar a que el DOM pinte y luego scrollear
        requestAnimationFrame(() => {
            chatArea.scrollTop = chatArea.scrollHeight;
        });

    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

async function loadHallInfo(hallId) {
    try {
        const response = await fetch(`/chat/info-halls/${hallId}`);
        const data = await response.json();

        const infoDiv = document.getElementById('halls-information');
        infoDiv.innerHTML = ''; // limpiar contenido previo

        if (data.info && data.info.length > 0) {
            const hall = data.info[0];

            infoDiv.innerHTML = `
                <div class="p-4 bg-red-100 rounded shadow ">
                    <h2 class="text-lg font-bold mb-2">${hall.hall_name}</h2>
                    <p class="text-sm text-gray-600">
                        <span class="font-semibold">Usuarios:</span> ${hall.users}
                    </p>
                    <p class="text-sm text-gray-500">
                        <span class="font-semibold">Creada:</span> ${hall.hall_created_at}
                    </p>
                </div>
            `;
        } else {
            infoDiv.innerHTML = `<p class="text-gray-500">No hay información de esta sala.</p>`;
        }
    } catch (error) {
        console.error('Error cargando información del hall:', error);
        document.getElementById('halls-information').innerHTML =
            `<p class="text-red-500">Error al cargar la información.</p>`;
    }
}
