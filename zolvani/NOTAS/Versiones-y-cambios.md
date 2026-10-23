# Versiones y cambios

## `v0.1.0-preview.1` — base preservada

Etiqueta existente sobre `7ce2907`, ejecutada previamente por el propietario. Rama estable `main` y rama `develop` apuntaban al mismo commit al iniciar esta sesión.

## Cambios locales sin publicar — 2026-10-23

La identidad del kit de marca quedó integrada en la interfaz, se añadió el adaptador Codex aislado y se amplió la cobertura de pruebas. Estos cambios no tienen commit ni nueva etiqueta porque la metadata de `.git` es de solo lectura en esta sesión.
# Trabajo local no publicado — 2026-10-23

Se integró `OmniRouteProvider` al motor, selección de modelos gratuitos explícitos y estado en el panel. Incluye fallback único por cuota entre dos modelos revisados como gratuitos. La instalación de OmniRoute terminó bajo `.tools`; el servicio no inicia en esta sesión por el fallo `uv_os_get_passwd returned ENOMEM`. No hubo llamadas de IA reales. Pruebas automáticas pasan con transporte simulado. No se creó commit o etiqueta; la versión reportada se mantiene `v0.1.0-preview.1`.
