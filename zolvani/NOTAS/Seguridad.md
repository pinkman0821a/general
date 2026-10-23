# Seguridad

- El servidor se mantiene en `127.0.0.1`.
- No se introdujeron credenciales, clientes reales, compras ni pedidos reales.
- El presupuesto DEMO sigue sin gasto; no se contabilizan importes de tokens en dinero.
- La simulación permanece activa por defecto.
- La demostración sigue siendo predeterminada. OmniRoute se opta explícitamente mediante `ZOLVANI_ENABLE_OMNIROUTE=1`; Codex usa el selector alternativo `ZOLVANI_AI_PROVIDER=codex-exec` y `ZOLVANI_ENABLE_CODEX=1`.
- El adaptador pide salida de solo lectura, modo efímero, respuesta estructurada y límite de tiempo/salida.
- No hay autenticación multiusuario; no exponer el servicio a Internet o a la red local.
- Los resultados generados por IA no son verificación comercial.
- OmniRoute solo admite base HTTP loopback. El lanzador fija `OMNIROUTE_SERVER_HOST=127.0.0.1` y ubica `DATA_DIR` dentro de `Z:\Zolvani\.tools`.
- El navegador nunca recibe la clave local de OmniRoute. El backend no reenvía datos con aspecto de claves, correos o teléfonos colombianos comunes.
- El adaptador permite solo modelos marcados como gratuitos en el catálogo o incluidos en `OMNIROUTE_FREE_MODELS` por revisión humana. Fallback configurado también requiere elegibilidad gratis; hay como máximo una llamada alternativa ante cuota 402/429.
- No se usa el alias `auto`; no hay fallback ante timeout, error de red, autenticación o errores ambiguos. Una falla tras respuesta tardía puede haber consumido cuota upstream; la tarea no se repite.
- El motor no hace compras, pedidos, mensajes, publicidad, acceso web ni comandos del computador.
