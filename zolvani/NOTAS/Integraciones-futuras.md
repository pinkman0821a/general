# Integraciones futuras

## Codex

Adaptador inicial: `server/providers/codex-exec.mjs`. Para la futura prueba controlada, usa una tarea interna e inocua, confirma primero el método de autenticación del CLI y revisa límites de uso de la cuenta. El comando debe ejecutarse solo con aprobación explícita, mantener `--sandbox read-only`, conservar `--ephemeral` y validar la respuesta JSON. No probar con búsqueda de proveedores ni con datos comerciales. No guardar tokens en el proyecto.

La prueba de esta sesión sustituye el proceso por un ejecutor de prueba y verifica resultado estructurado, métricas devueltas y rechazo de formato inválido. No ejecuta el CLI.

## Pendientes externos

Dropi, WhatsApp Business, TikTok, Facebook, Instagram, Firebase y publicación están fuera de servicio. Cualquier integración requerirá documentación oficial, permisos mínimos, revisión de privacidad y autorización de acciones con efecto externo.

### Dropi — consulta de catálogo pendiente

Revisión pública de las páginas oficiales el 2026-10-23: Dropi presenta catálogo en su plataforma y enumera integraciones comerciales. Se encontró `https://api.dropi.co/`, pero su raíz pública solo indica “Api Dropi”: no expone allí una especificación, autenticación, alcances ni endpoints de lectura de catálogo/precios/inventario. La existencia del subdominio no acredita el acceso autorizado de Zolvani ni el alcance permitido. Los términos oficiales describen límites a automatización indebida y extracción masiva. Hasta que el propietario obtenga documentación y autorización vigentes, solo se registrarán manualmente referencias, precios y evidencias autorizadas. No se sondean rutas no documentadas, no hay login automático ni scraping.

Referencias: [catálogo oficial](https://dropi.co/), [raíz oficial Api Dropi](https://api.dropi.co/), [integraciones para proveedores](https://www.dropi.co/soluciones-para-proveedores), [términos oficiales](https://dropi.co/terminos-y-condiciones), [procedimiento local CSV](../docs/CATALOGO_PRODUCTOS.md).
