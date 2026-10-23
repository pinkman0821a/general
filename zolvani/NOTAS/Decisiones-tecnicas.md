# Decisiones técnicas

## D-001 — Mantener el stack liviano

Se conserva Node nativo y la interfaz que ya funcionaba. No se añade React, Three.js ni infraestructura de sincronización para integrar la marca o probar el contrato Codex.

## D-002 — CLI Codex primero

Para tareas internas puntuales se prepara `codex exec --ephemeral --sandbox read-only --json --output-schema`. La aplicación conserva la simulación como modo predeterminado; una integración real se habilitará después de revisar cuotas, permisos, cancelación y proceso de aprobación en Windows.

## D-003 — Evidencia no equivale a verificación externa

Un resumen producido por Codex no acredita precio, stock ni proveedor. La integración de exploración comercial y los canales externos siguen desactivados.

## D-004 — QOwnNotes usa Markdown del proyecto

`NOTAS/` puede abrirse como carpeta de notas existente. No se alteran cuadernos ni ajustes externos.
