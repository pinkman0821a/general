# Integraciones futuras

## Codex

Adaptador inicial: `server/providers/codex-exec.mjs`. Para la futura prueba controlada, usa una tarea interna e inocua, confirma primero el método de autenticación del CLI y revisa límites de uso de la cuenta. El comando debe ejecutarse solo con aprobación explícita, mantener `--sandbox read-only`, conservar `--ephemeral` y validar la respuesta JSON. No probar con búsqueda de proveedores ni con datos comerciales. No guardar tokens en el proyecto.

La prueba de esta sesión sustituye el proceso por un ejecutor de prueba y verifica resultado estructurado, métricas devueltas y rechazo de formato inválido. No ejecuta el CLI.

## Pendientes externos

Dropi, WhatsApp Business, TikTok, Facebook, Instagram, Firebase y publicación están fuera de servicio. Cualquier integración requerirá documentación oficial, permisos mínimos, revisión de privacidad y autorización de acciones con efecto externo.
