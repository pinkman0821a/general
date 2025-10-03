function renderHalls(halls) {
    const sidebar = document.getElementById('sidebar-halls');
    sidebar.innerHTML = '';

    halls.forEach(hall => {
        const button = document.createElement('button');
        button.textContent = hall.name;
        button.dataset.hallId = hall.id;

        // 🎨 Estilo oscuro con glass y hover
        button.className = `
            w-full text-left px-3 py-2 rounded-lg
            bg-gray-700/50 border border-gray-600/40
            text-gray-200 hover:bg-indigo-600/50 hover:text-white
            transition focus:outline-none
        `;

        button.addEventListener('click', () => {
            // Quitar highlight previo
            document.querySelectorAll('#sidebar-halls button').forEach(b => {
                b.classList.remove('bg-indigo-600/70', 'text-white', 'shadow-md');
            });

            // Marcar el botón seleccionado
            button.classList.add('bg-indigo-600/70', 'text-white', 'shadow-md');

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
                <div class="p-2 bg-gray-800/70 backdrop-blur-md rounded-lg border border-gray-700/50 shadow-md text-sm">
                    <h2 class="text-lg font-semibold mb-2 text-indigo-300">
                        ${hall.hall_name}
                    </h2>

                    <p class="text-xs text-gray-300 mb-1">
                        <span class="font-medium text-indigo-400">👥 Usuarios:</span> ${hall.users}
                    </p>

                    <p class="text-xs text-gray-400 mb-2">
                        <span class="font-medium text-indigo-400">📅 Creada:</span> ${hall.hall_created_at}
                    </p>

                    <button 
                        id="add-user-btn"
                        class="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition focus:outline-none focus:ring-1 focus:ring-indigo-400">
                        ➕ Agregar Usuario
                    </button>
                </div>
            `;


            // ✅ Listener para abrir modal
            const openAddUserBtn = document.getElementById("add-user-btn");
            const modalAddUser = document.getElementById("modal-add-user");

            openAddUserBtn.addEventListener("click", () => {
                modalAddUser.classList.remove("hidden");
            });
        } else {
            infoDiv.innerHTML = `<p class="text-gray-400">No hay información de esta sala.</p>`;
        }
    } catch (error) {
        console.error('Error cargando información del hall:', error);
        document.getElementById('halls-information').innerHTML =
            `<p class="text-red-400">Error al cargar la información.</p>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modal");
    const createHallBtn = document.getElementById("create-hall");
    const closeModalBtn = document.getElementById("close-modal");

    // Mostrar modal
    createHallBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
    });

    // Cerrar modal
    closeModalBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Acción al crear hall
    document.getElementById("submit-hall").addEventListener("click", async () => {
        const name = document.getElementById("hall-name").value;
        console.log("Nuevo Hall:", { name });

        const created = await createHall(name);

        if (created) {
            const added = await addHall(user_id, name); // 👈 esperar la asociación
            if (added) {
                // 👇 refrescar halls del usuario
                socket.emit('get_user_halls', { user_id: user_id });
            } else {
                console.error("No se pudo asociar el usuario al hall");
            }
        } else {
            console.error("No se pudo crear el hall");
        }

        modal.classList.add("hidden"); // se cierra al crear
    });

});

async function createHall(name) {
    try {
        const response = await fetch('/chat/create-hall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hall_name: name })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Hall created successfully.', data);
            return data;
        } else {
            console.error('Failed to create hall', data.error || data);
            return null;
        }
    } catch (error) {
        console.error('Error creating hall', error);
        return null;
    }
}

async function addHall(user_id, hall_name) {
    try {
        const response = await fetch('/chat/add-user-to-hall-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hall_name: hall_name, user_id: user_id })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('added to Hall successfully.', data);
            return data;
        } else {
            console.error('Failed to add hall', data.error || data);
            return null;
        }
    } catch (error) {
        console.error('Error adding user to hall:', error);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const hallsInfo = document.getElementById('halls-information');
    const modalAddUser = document.getElementById('modal-add-user');

    // Delegación: escucha clicks dentro de halls-information
    hallsInfo.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.id === 'add-user-btn') {
            loadUsers(); // carga usuarios dinámicamente
            modalAddUser.classList.remove('hidden');
        }
    });

    // Delegación global para cerrar/submit del modal (funciona aunque botones sean dinámicos)
    document.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'close-add-user') {
            modalAddUser.classList.add('hidden');
        }
        if (e.target && e.target.id === 'submit-add-user') {
            const selectedUser = document.getElementById('select-user').value;
            console.log('Usuario seleccionado:', selectedUser, 'Hall actual:', currentHallId);

            // 👉 Llamar tu función para agregar usuario al hall actual
            const added = await adduserhall(selectedUser, currentHallId);
            loadHallInfo(currentHallId);

            if (added) {
                console.log("Usuario agregado al hall correctamente ✅");
                // refrescar info del hall para ver usuarios actualizados
                loadHallInfo(currentHallId);
            } else {
                console.error("No se pudo agregar el usuario ❌");
            }

            modalAddUser.classList.add('hidden');
        }
    });
});

async function loadUsers() {
    try {
        const response = await fetch('/chat/get-users', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (response.ok && data.info) {
            const select = document.getElementById("select-user");

            // Reiniciar opciones
            select.innerHTML = '<option disabled selected>-- Selecciona un usuario --</option>';

            // Recorrer usuarios
            data.info.forEach(user => {
                const option = document.createElement("option");

                // ⚡ Ajusta según tu API real
                option.value = user.user_id || user.id;
                option.textContent = user.username || user.name;

                select.appendChild(option);
            });
        } else {
            console.error("Error al obtener usuarios:", data);
        }
    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }
}


async function adduserhall(idUserLoad, hall_id) {
    try {
        const response = await fetch('/chat/add-user-to-hall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: idUserLoad, hall_id: hall_id })
        });

        let data;
        try {
            data = await response.json();
        } catch {
            data = { error: "Respuesta no es JSON" };
        }

        if (response.ok) {
            console.log('✅ Usuario agregado al Hall:', data);
            return data;
        } else {
            console.error('❌ Error al agregar:', data.error || data);
            return null;
        }
    } catch (error) {
        console.error('⚠️ Error en la petición:', error);
        return null;
    }
}
