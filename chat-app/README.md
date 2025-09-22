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

   - Envío y recepción de mensajes instantáneos entre usuarios.

   - Actualización en tiempo real sin necesidad de recargar la página.

   - Posibilidad de eliminar mensajes propios (opcional, con confirmación).

3. Salas de Chat

    - Sala general (pública) para todos los usuarios conectados.

    - Salas privadas entre dos o más usuarios (chat privado).

    - Visualización de qué usuarios están en cada sala.

4. Historial de Conversaciones

    - Almacenamiento de mensajes en base de datos.

    - Posibilidad de consultar historial por sala o por usuario.

    - Mensajes ordenados por fecha y hora.

5. Interfaz de Usuario

    - Diseño responsivo (adaptable a móvil y escritorio).

    - Interfaz intuitiva y moderna.

    - Diferenciación visual de mensajes enviados y recibidos.

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
