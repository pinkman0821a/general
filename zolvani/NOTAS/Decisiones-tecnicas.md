# Decisiones técnicas

## D-001 — Mantener el stack liviano

Se conserva Node nativo y la interfaz que ya funcionaba. No se añade React, Three.js ni infraestructura de sincronización para integrar la marca o probar el contrato Codex.

## D-002 — CLI Codex primero

Para tareas internas puntuales se prepara `codex exec --ephemeral --sandbox read-only --json --output-schema`. La aplicación conserva la simulación como modo predeterminado; una integración real se habilitará después de revisar cuotas, permisos, cancelación y proceso de aprobación en Windows.

## D-003 — Evidencia no equivale a verificación externa

Un resumen producido por Codex no acredita precio, stock ni proveedor. La integración de exploración comercial y los canales externos siguen desactivados.

## D-004 — QOwnNotes usa Markdown del proyecto

`NOTAS/` puede abrirse como carpeta de notas existente. No se alteran cuadernos ni ajustes externos.

## D-005 — Datos de producto locales con trazabilidad por campo

El catálogo reside en el estado JSON local ya excluido en `.gitignore`; CSV solo se importa como contenido limitado (sin rutas entregadas por cliente). Toda cifra conserva su fuente y fecha, y un campo ausente no equivale a cero. La aplicación puede calcular contribución parcial y mostrar faltantes, pero no presenta una oportunidad como vendible. Una referencia seleccionada se transmite a IA solo bajo acción explícita, con bloqueo de datos personales y etiquetas de contenido no confiable. Los resultados de la IA no reemplazan los cálculos de código.

## D-006 — Dropi manual hasta autorización de integración

No hay en esta revisión documentación pública oficial suficiente para conectar el catálogo de Dropi. No se automatiza la sesión del usuario ni se extraen datos. Si el proveedor entrega documentación y autorización para la cuenta, se revisarán permisos, términos y privacidad antes de implementar un conector.
