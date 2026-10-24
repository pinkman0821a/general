# Historial de cambios

## Trabajo local sin publicar — coordinación de la Reina (2026-10-23)

### Añadido
- Objetivos IA persistidos con huevo de planificación de Reina y etapas deterministas para Exploradora, Financiera e Inspectora.
- Dependencias explícitas que transfieren las entregas previas marcadas como no verificadas; Reina consolida el informe sin llamada adicional.
- Plan estructurado con validación local estricta, límite de cuatro solicitudes por objetivo, cola serial, modelo fijado por objetivo, idempotencia, cancelación y detención ante errores.
- Formulario para objetivo en panel, visualización de etapas, huevos, estados, resultados, dependencias, informe e historial.
- Resguardo financiero que impide presentar importes o porcentajes no verificados y descarte de salidas con posibles credenciales/datos personales.

### Verificación pendiente
- Pruebas locales aprobadas: `npm.cmd run check`; `npm.cmd test` 43/43. Falta la prueba real de coordinación con Gemini desde el entorno del propietario.
- Una ejecución real controlada, iniciada por el propietario con OmniRoute/Gemini seleccionados; no se cambió la versión ni el respaldo.

## Trabajo local sin publicar — OmniRoute (2026-10-23)

### Añadido
- Adaptador backend `OmniRouteProvider` para modelos y chat-completions OpenAI-compatible en loopback, con selección gratuita explícita, estructura JSON, timeout, cancelación y diagnóstico de cuota.
- Una sola ruta alternativa, solo si también figura como gratuita y la ruta seleccionada devuelve un error explícito de cuota; sin reintentos en timeout, autenticación o fallos ambiguos.
- API local para estado y selección del modelo; el panel informa conexión, modelos elegibles, proveedor upstream, salida e historial.
- Bloqueo local de claves, correos y teléfonos colombianos comunes antes de persistir una solicitud IA.
- Pruebas integrales con servidor OmniRoute simulado, sin conexión externa ni consumo real.

### Pendiente
- OmniRoute `3.8.52` quedó instalado en prefijo local ignorado por Git. El arranque no fue posible en esta sesión, así que no se confirmó el bind del puerto ni la existencia de una ruta gratuita.
- No se ejecutó una tarea real de IA: queda una prueba manual única cuando el propietario conecte y compruebe una ruta gratuita.
- No hay commit ni versión nueva por bloqueo de escritura en `.git`.

## Trabajo local sin publicar — 2026-10-23

### Añadido
- Conexión optativa del motor serial a `CodexExecProvider`, con activación explícita, tarea real fija e idempotencia.
- Estados e historial de tarea persistidos, revisión determinista de esquema, pausa/reanudación, cancelación y recuperación de una ejecución Codex interrumpida sin reintento automático.
- Panel con indicador de modo y estado del proveedor, resultado IA diferenciado, evidencias e historial.
- Renderer Canvas de hormigas estilizadas con caminos y movimiento asociado a estado operativo.
- Pruebas para proveedor simulado integrado, deduplicación, límites desactivados, cancelación y recuperación.

### Nota
- No se ha ejecutado Codex real ni se ha actualizado la versión. La prueba real queda documentada en README.

## [0.1.0-preview.1] — 2026-10-23

### Añadido
- Aplicación web local sin dependencias NPM.
- Reina con asignación automática de tareas y seis abejas de especialidad.
- Estados, inspección automatizada de resultados demo, recuperación al reiniciar y registro.
- Vista de Colmena 3D ligera usando Canvas y proyección de geometría 3D.
- Productos y celdillas ficticios, balance inicial 130.000 COP.
- Pruebas automáticas con `node:test`, protección contra origen externo y límite de solicitudes.
- Documentación, guía de seguridad y configuración Git.

### Pendiente
- Codex real, Dropi, WhatsApp, redes, Firebase y Three.js.

## Cambios locales sin publicar — 2026-10-23

- Integración responsiva del kit de identidad visual existente y tokens CSS centralizados.
- Adaptador optativo `codex exec` con sandbox de solo lectura, salida estructurada y pruebas simuladas; aún no conectado a la cola.
- Documentación técnica en `NOTAS/` para QOwnNotes y ampliación de verificaciones.
- La versión sigue siendo `0.1.0-preview.1`: los cambios no tienen commit ni etiqueta por la restricción de escritura sobre `.git`.
