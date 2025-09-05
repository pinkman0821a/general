const socket = io(); // Conecta al backend Socket.IO
const mensajesContainer = document.getElementById("mensajes-container");
const formMensaje = document.getElementById("form-mensaje");
const inputMensaje = document.getElementById("mensaje-input");

// Obtener user_id y username del localStorage
const user_id = localStorage.getItem('user_id');
const username = localStorage.getItem('username');

// Función para mostrar mensajes en pantalla
function mostrarMensaje(data) {
    const div = document.createElement('div');
    div.classList.add('mensaje');
    div.textContent = `[${data.fecha} ${data.hora}] ${data.username}: ${data.mensaje}`;
    mensajesContainer.appendChild(div);
    mensajesContainer.scrollTop = mensajesContainer.scrollHeight; // auto scroll
}

// Cargar mensajes iniciales desde la base de datos
async function cargarMensajes() {
    try {
        const res = await fetch('/mensajes');
        const mensajes = await res.json();
        mensajesContainer.innerHTML = '';
        mensajes.forEach(m => mostrarMensaje(m));
    } catch (err) {
        console.error(err);
    }
}

// Enviar mensaje
formMensaje.addEventListener('submit', (e) => {
    e.preventDefault();
    const mensaje = inputMensaje.value.trim();
    if (!mensaje) return;

    const data = {
        user_id: user_id,
        username: username,
        mensaje: mensaje,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString()
    };

    socket.emit('mensaje', data); // enviar al servidor
    inputMensaje.value = '';
});

// Escuchar mensajes enviados por otros usuarios
socket.on('mensaje', (data) => {
    mostrarMensaje(data);
});

// Cargar mensajes al inicio
cargarMensajes();
