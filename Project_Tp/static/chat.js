// ============================
// 🔥 CONEXIÓN SOCKET.IO
// ============================
const socket = io();

// ============================
// 🎯 ELEMENTOS DEL DOM
// ============================
const formMensaje = document.getElementById("form-mensaje");
const inputMensaje = document.getElementById("mensaje-input");
const chatList = document.getElementById("chat");

// ============================
// 👤 DATOS DEL USUARIO
// ============================
const currentUserId = Number(localStorage.getItem("user_id"));
const username = localStorage.getItem("username");

// ============================
// 🔄 UTILIDADES
// ============================
const scrollToBottom = () => chatList.scrollTop = chatList.scrollHeight;

const showAlert = (msg) => alert(msg);

// ============================
// 💬 RENDER DE MENSAJES
// ============================
function crearMenuMensaje(data) {
  // Si es admin (userId = 1)
  if (currentUserId === 1) {
    return `
      <div class="relative inline-block text-left">
        <button class="kebab px-2 py-1 rounded-full hover:bg-gray-700 transition">
          ⋯
        </button>
        <div class="menu-list hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
          <button class="delete-btn block w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition">
            Eliminar mensaje
          </button>
          <button id="btnDeleteAll" class="block w-full px-4 py-2 text-sm text-red-500 hover:bg-gray-700 transition">
            Eliminar todos los mensajes
          </button>
        </div>
      </div>`;
  }

  // Si es el dueño del mensaje
  if (data.user_id === currentUserId) {
    return `
      <div class="relative inline-block text-left">
        <button class="kebab px-2 py-1 rounded-full hover:bg-gray-700 transition">
          ⋯
        </button>
        <div class="menu-list hidden absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
          <button class="delete-btn block w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition">
            Eliminar mensaje
          </button>
        </div>
      </div>`;
  }

  // Otros usuarios no ven menú
  return "";
}


// helper: smooth scroll con fallback
function smoothScrollToBottom(container, duration = 320) {
  if (!container) return;
  // si el navegador soporta scrollBehavior
  try {
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    return;
  } catch (e) {
    // si no soporta, hacemos un fallback animado
  }

  const start = container.scrollTop;
  const end = container.scrollHeight;
  const startTime = performance.now();

  function easeInOut(t) { return 0.5 - Math.cos(Math.PI * t) / 2; }

  function tick(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    container.scrollTop = start + (end - start) * easeInOut(t);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// función principal
function mostrarMensaje(data) {
  const li = document.createElement("li");
  li.classList.add("message");
  li.id = `msg-${data.id}`;
  li.dataset.id = data.id;
  li.dataset.userId = data.user_id;

  // Mapa de colores por usuario
  const userColors = {
    2: "text-red-400",
    3: "text-green-400",
    4: "text-purple-400"
  };
  const colorClass = userColors[data.user_id] || "text-white";

  li.innerHTML = `
    <div class="flex flex-col bg-gray-800 rounded-lg p-3 shadow-md relative hover:bg-gray-700 transition">
      <span class="text-sm font-semibold italic ${colorClass} mb-1">@${data.username}</span>
      <span class="text-base font-medium italic text-gray-200 break-words">${data.mensaje}</span>
      <span class="text-[0.65rem] italic text-gray-400 text-right mt-1">${data.fecha} ${data.hora}</span>
      <div class="absolute top-2 right-2">${crearMenuMensaje(data)}</div>
    </div>
  `;

  // append
  chatList.appendChild(li);

  // -> el contenedor scrollable real (asegúrate que este id exista en tu HTML)
  const scrollContainer = document.getElementById('mensajes-container') || chatList.parentElement;

  // Esperar a que el navegador calcule layout y luego hacer scroll suave
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      smoothScrollToBottom(scrollContainer);
    });
  });
}




// ============================
// 📥 CARGAR MENSAJES
// ============================
async function cargarMensajes() {
  try {
    const res = await fetch("/mensajes");
    const mensajes = await res.json();
    chatList.innerHTML = "";
    mensajes.forEach(mostrarMensaje);
    scrollToBottom();
  } catch (err) {
    console.error("Error cargando mensajes:", err);
  }
}

// ============================
// 📝 ENVIAR MENSAJE
// ============================
async function enviarMensaje(mensaje) {
  if (!mensaje.trim()) return;

  const data = {
    user_id: currentUserId,
    username,
    mensaje: mensaje.trim(),
    fecha: new Date().toISOString().split("T")[0],
    hora: new Date().toLocaleTimeString(),
  };

  socket.emit("mensaje", data);
}

// ============================
// 🗑️ BORRAR MENSAJES
// ============================
async function borrarMensaje(msgId, li) {
  try {
    const resp = await fetch(`/mensajes/${msgId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUserId }),
    });
    const data = await resp.json();

    if (!data.success) showAlert(data.error || "Error al eliminar mensaje");
    else li.remove();
  } catch (err) {
    console.error("Error eliminando mensaje:", err);
    showAlert("Error de red eliminando mensaje");
  }
}

async function borrarTodosLosMensajes(btn) {
  if (!confirm("¿Eliminar todos los mensajes? Esta acción es irreversible.")) return;

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Eliminando...";

  try {
    const resp = await fetch("/mensajes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUserId }),
    });
    const data = await resp.json();

    if (data.success) {
      chatList.innerHTML = "";
      showAlert(data.mensaje || "Todos los mensajes fueron eliminados");
    } else showAlert(data.error || "No se pudieron eliminar los mensajes");
  } catch (err) {
    console.error("Error eliminando todos los mensajes:", err);
    showAlert("Error de red eliminando mensajes");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ============================
// ⚙️ EVENTOS
// ============================

// Enviar mensaje
formMensaje.addEventListener("submit", (e) => {
  e.preventDefault();
  enviarMensaje(inputMensaje.value);
  inputMensaje.value = "";
});

// Delegación de eventos en chatList
chatList.addEventListener("click", (e) => {
  const kebab = e.target.closest(".kebab");
  if (kebab) {
    e.stopPropagation();
    kebab.nextElementSibling.classList.toggle("hidden");
    return;
  }

  const delBtn = e.target.closest(".delete-btn");
  if (delBtn) {
    const li = delBtn.closest("li.message");
    const msgId = Number(li.dataset.id);
    const authorId = Number(li.dataset.userId);

    if (authorId !== currentUserId && currentUserId !== 1) {
      showAlert("No puedes borrar este mensaje");
      return;
    }
    if (!confirm("¿Eliminar este mensaje?")) return;

    borrarMensaje(msgId, li);
  }

  if (e.target && e.target.id === "btnDeleteAll") borrarTodosLosMensajes(e.target);
});

// Cerrar menús al hacer click fuera
document.addEventListener("click", () => {
  document.querySelectorAll(".menu-list").forEach(menu => menu.classList.add("hidden"));
});

// ============================
// 🔄 SOCKET.IO
// ============================
socket.on("mensaje", mostrarMensaje);
socket.on("mensaje_eliminado", ({ id }) => {
  const li = document.getElementById(`msg-${id}`);
  if (li) li.remove();
});

// ============================
// 🚀 INICIALIZACIÓN
// ============================
cargarMensajes();
