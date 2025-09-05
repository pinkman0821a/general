const socket = io(); // Conecta al backend Socket.IO
const formMensaje = document.getElementById("form-mensaje");
const inputMensaje = document.getElementById("mensaje-input");
const chatList = document.getElementById("chat");

// Obtener user_id y username del localStorage
const currentUserId = Number(localStorage.getItem("user_id"));
const username = localStorage.getItem("username");

// ---------------------------
// Función para renderizar mensaje
// ---------------------------
function mostrarMensaje(data) {
  const li = document.createElement("li");
  li.classList.add("message");
  li.id = `msg-${data.id}`;
  li.dataset.id = data.id;
  li.dataset.userId = data.user_id;

  // Menú contextual (⋯)
  let menuHtml = "";

  if (data.user_id === currentUserId) {
    // Opción de eliminar solo tu mensaje
    menuHtml = `
      <div class="menu">
        <button class="kebab" aria-haspopup="true" aria-expanded="false">⋯</button>
        <div class="menu-list hidden">
          <button class="delete-btn">Eliminar mensaje</button>
        </div>
      </div>`;
  }

  // Si el usuario autenticado es el admin (id = 1), mostrar también "Eliminar todos"
  if (currentUserId === 1) {
    menuHtml += `
      <div class="menu">
        <button class="kebab" aria-haspopup="true" aria-expanded="false">⋯</button>
        <div class="menu-list hidden">
          <button class="delete-btn">Eliminar mensaje</button>
          <button id="btnDeleteAll">Eliminar todos los mensajes</button>
        </div>
      </div>`;
  }

  li.innerHTML = `
    <span class="text">
      <strong>@${data.username}</strong> ${data.mensaje}
    </span>
    ${menuHtml}
  `;

  chatList.appendChild(li);
}

// ---------------------------
// Cargar mensajes iniciales desde la base de datos
// ---------------------------
async function cargarMensajes() {
  try {
    const res = await fetch("/mensajes");
    const mensajes = await res.json();
    chatList.innerHTML = "";
    mensajes.forEach((m) => mostrarMensaje(m));

    // Siempre bajar al final
    chatList.scrollTop = chatList.scrollHeight;
  } catch (err) {
    console.error("Error cargando mensajes:", err);
  }
}

// ---------------------------
// Enviar mensaje
// ---------------------------
formMensaje.addEventListener("submit", (e) => {
  e.preventDefault();
  const mensaje = inputMensaje.value.trim();
  if (!mensaje) return;

  const data = {
    user_id: currentUserId,
    username: username,
    mensaje: mensaje,
    fecha: new Date().toISOString().split("T")[0],
    hora: new Date().toLocaleTimeString(),
  };

  socket.emit("mensaje", data); // enviar al servidor
  inputMensaje.value = "";
});

// ---------------------------
// Escuchar mensajes enviados por otros usuarios
// ---------------------------
socket.on("mensaje", (data) => {
  mostrarMensaje(data);

  // Siempre bajar al final cuando llega uno nuevo
  chatList.scrollTop = chatList.scrollHeight;
});

// ---------------------------
// Escuchar cuando un mensaje es eliminado por alguien
// ---------------------------
socket.on("mensaje_eliminado", ({ id }) => {
  const li = document.getElementById(`msg-${id}`);
  if (li) li.remove();
});

// ---------------------------
// Manejo de menús y botones (delegación de eventos en chatList)
// ---------------------------

// Cerrar menús al hacer click fuera
document.addEventListener("click", () => {
  document
    .querySelectorAll(".menu-list")
    .forEach((menu) => menu.classList.add("hidden"));
});

chatList.addEventListener("click", (e) => {
  // Abrir/cerrar menú de 3 puntos
  const kebab = e.target.closest(".kebab");
  if (kebab) {
    e.stopPropagation();
    const menu = kebab.nextElementSibling;
    menu.classList.toggle("hidden");
    return;
  }

  // Click en "Eliminar mensaje"
  const delBtn = e.target.closest(".delete-btn");
  if (delBtn) {
    const li = delBtn.closest("li.message");
    const msgId = Number(li.dataset.id);
    const authorId = Number(li.dataset.userId);

    if (authorId !== currentUserId) {
      alert("No puedes borrar el mensaje; tú no lo escribiste.");
      return;
    }

    if (!confirm("¿Eliminar este mensaje?")) return;

    fetch(`/mensajes/${msgId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUserId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          alert(data.error || "Error al eliminar.");
          return;
        }
        li.remove(); // eliminar localmente
      })
      .catch((err) => {
        console.error("Error de red eliminando el mensaje:", err);
        alert("Error de red eliminando el mensaje.");
      });
  }

  // Click en "Eliminar todos los mensajes" (solo admin)
  if (e.target && e.target.id === "btnDeleteAll") {
    handleDeleteAll(e);
  }
});

// ---------------------------
// Función para eliminar todos los mensajes
// ---------------------------
async function handleDeleteAll(event) {
  event.preventDefault();

  const currentUserId = Number(localStorage.getItem("user_id"));

  const ok = confirm(
    "¿Estás seguro? Esta acción eliminará todos los mensajes de forma permanente."
  );
  if (!ok) return;

  const btnDeleteAll = event.target;
  btnDeleteAll.disabled = true;
  const originalText = btnDeleteAll.textContent;
  btnDeleteAll.textContent = "Eliminando...";

  try {
    const resp = await fetch("/mensajes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUserId }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      alert(data.error || "Error eliminando los mensajes (respuesta no OK).");
      return;
    }

    if (data.success) {
      chatList.innerHTML = ""; // limpiar lista
      alert(data.mensaje || "Todos los mensajes fueron eliminados.");
    } else {
      alert(data.error || "No se pudo eliminar todos los mensajes.");
    }
  } catch (err) {
    console.error("Error en delete all:", err);
    alert("Error de red al intentar eliminar todos los mensajes. Revisa la consola.");
  } finally {
    btnDeleteAll.disabled = false;
    btnDeleteAll.textContent = originalText;
  }
}

// ---------------------------
// Cargar mensajes al inicio
// ---------------------------
cargarMensajes();
