# 📄 Enunciado del Proyecto – Desarrollo de Aplicación de Chat en Tiempo Real

## Objetivo del Proyecto

Se requiere el desarrollo de una aplicación web de chat en tiempo real que permita a los usuarios registrarse, iniciar sesión, unirse a salas de conversación y enviar/recibir mensajes instantáneos. El sistema debe ser funcional, seguro, escalable y bien documentado.

## Alcance del Proyecto

El proyecto deberá incluir, como mínimo, las siguientes funcionalidades:

1. ✅Gestión de Usuarios

   - ✅Registro de nuevos usuarios con validación de datos.

   - ✅Inicio de sesión con autenticación segura (mínimo JWT o sesiones).

   - ✅Control de usuarios conectados (lista visible en la interfaz).

2. Mensajería en Tiempo Real

   - ✅Envío y recepción de mensajes instantáneos entre usuarios.

   - ✅Actualización en tiempo real sin necesidad de recargar la página.

   - ✅Posibilidad de eliminar mensajes propios (opcional, con confirmación).

3. Salas de Chat

    - 🔴Sala general (pública) para todos los usuarios conectados.

    - ✅Salas privadas entre dos o más usuarios (chat privado).

    - ✅Visualización de qué usuarios están en cada sala.

4. Historial de Conversaciones

    - ✅Almacenamiento de mensajes en base de datos.

    - 🔴Posibilidad de consultar historial por sala o por usuario.

    - ✅Mensajes ordenados por fecha y hora.

5. Interfaz de Usuario

    - 🟡Diseño responsivo (adaptable a móvil y escritorio).

    - 🟡Interfaz intuitiva y moderna.

    - ✅Diferenciación visual de mensajes enviados y recibidos.

## Documentación Requerida

El desarrollador deberá entregar junto con el proyecto la siguiente documentación:

1. Manual Técnico

    - Descripción de la arquitectura del sistema.

    - Tecnologías utilizadas y justificación de su elección.

    - Instrucciones para desplegar el proyecto en un servidor local y en producción.

    - Diagramas de arquitectura, flujo de datos y modelo de base de datos.

2. Manual de Usuario

    - Guía breve de cómo registrarse, iniciar sesión, entrar a salas y enviar mensajes.

3. Documentación del Código

    - Comentarios en el código explicando las funciones principales.

    - Estructura clara del proyecto (frontend/backend).

## Requisitos Técnicos

- Backend: Python (Flask o FastAPI) con Socket.IO, o Node.js con Express y Socket.IO.

- Frontend: HTML, CSS (preferiblemente Tailwind o Bootstrap), JavaScript.

- Base de Datos: MySQL o PostgreSQL.

- Control de versiones: Git (repositorio privado en GitHub o GitLab).

- Servidor: Deberá poder desplegarse en Ubuntu 22.04 con Nginx/Gunicorn (o equivalente).

## Límites del Proyecto (Lo que NO está incluido)

- No se requiere app móvil nativa (solo interfaz web responsiva).

- No se incluye integración con redes sociales para login.

- No se implementará cifrado de extremo a extremo (solo seguridad básica de datos).

- No se contemplan notificaciones push fuera de la web.

## Entregables Finales

1. Código fuente completo en repositorio privado.

2. Documentación técnica y manual de usuario.

3. Scripts para crear la base de datos y poblarla con datos de prueba.

4. Aplicación funcionando en un servidor de pruebas (demo online).

```
chat-app/ 
│ 
├── backend/ # Lógica del servidor (Flask / FastAPI) 
│ ├── app.py # Punto de entrada de la app (inicia Flask y Socket.IO) 
│ ├── config.py # Configuración (DB, claves secretas, etc.) 
│ ├── models.py # Modelos ORM (SQLAlchemy) 
│ ├── routes/ # Rutas HTTP 
│ │ ├── __init__.py 
│ │ ├── auth_routes.py # Registro e inicio de sesión 
│ │ └── chat_routes.py # Endpoints para historial, etc. 
│ ├── sockets/ # Eventos de Socket.IO 
│ │ ├── __init__.py 
│ │ └── chat_socket.py # Manejo de mensajes en tiempo real 
│ ├── utils/ # Funciones auxiliares (JWT, validaciones) 
│ │ ├── auth.py 
│ │ └── helpers.py 
│ └── tests/ # Pruebas unitarias 
│ ├── test_auth.py 
│ └── test_chat.py 
│ ├── frontend/ # Interfaz del usuario 
│ ├── index.html # Página principal (login/chat) 
│ ├── chat.html # Vista del chat 
│ ├── static/ 
│ │ ├── css/ 
│ │ │ ├── styles.css # Estilos generales 
│ │ │ └── chat.css # Estilos específicos del chat 
│ │ ├── js/ 
│ │ │ ├── auth.js # Lógica de login y registro 
│ │ │ ├── chat.js # Manejo de mensajes en tiempo real 
│ │ │ └── utils.js # Funciones de apoyo frontend 
│ │ └── img/ # Imágenes e íconos 
│ └── templates/ # (Opcional si usas Jinja2) 
│ ├── base.html 
│ ├── login.html 
│ └── chat.html 
│ ├── docs/ # Documentación del proyecto 
│ ├── manual_tecnico.md 
│ ├── manual_usuario.md 
│ ├── arquitectura.png 
│ └── modelo_db.png 
│ ├── database/ # Scripts SQL 
│ ├── schema.sql # Creación de tablas 
│ └── seed.sql # Datos de prueba 
│ ├── .env # Variables de entorno (claves, DB URL) 
├── requirements.txt # Dependencias de Python 
├── README.md # Documentación principal 
└── run.sh # Script para ejecutar el proyecto