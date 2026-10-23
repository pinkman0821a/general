# Instrucciones permanentes — ZOLVANI: LA COLONIA

## Propósito y alcance

Desarrollar la aplicación local existente conservando su motor, datos, historial y demostración. La Reina coordina seis hormigas especializadas; los huevos son tareas y las celdillas son registros comerciales. Mantener identificadores de agentes, productos y pedidos para no romper los datos guardados.

## Límites obligatorios

- Trabajar exclusivamente en `Z:\Zolvani`; preservar artefactos y cambios del propietario.
- No reconstruir la aplicación desde cero, borrar el simulador ni usar comandos destructivos de Git.
- No exponer el servidor fuera de loopback ni iniciar ejecuciones Codex recursivas durante el desarrollo de Zolvani.
- No ejecutar compras, pedidos Dropi, mensajes o publicaciones comerciales; no guardar credenciales ni datos reales de clientes.
- La IA real solo se inicia por acción expresa dentro del panel y con `ZOLVANI_ENABLE_OMNIROUTE=1` (o el proveedor alternativo explícito `ZOLVANI_AI_PROVIDER=codex-exec` más `ZOLVANI_ENABLE_CODEX=1`). Mantener concurrencia 1, timeout, cancelación y no repetir errores ambiguos ni interrupciones.
- OmniRoute debe estar en localhost/loopback. Nunca enviar una solicitud a un endpoint externo ni exponer secretos al navegador. Bloquear modelos sin señal gratuita o ID incluido en la lista local revisada por el propietario. No usar alias `auto` ni rutas pagadas.
- Nunca presentar hipótesis generadas por un modelo como precios, inventario, fuentes o verificaciones reales.
- Simulación e IA real deben estar marcadas por separado en almacenamiento e interfaz.

## Arquitectura actual

- Node.js nativo, servidor HTTP local y estado JSON; sin instalación de dependencias para desarrollo.
- `server/core.mjs`: cola, persistencia, Reina determinista, estados, historial y validación determinista de formato.
- `server/providers/omniroute.mjs`: adaptador OpenAI-compatible de OmniRoute local, con verificación de modelos gratuitos, timeout, cancelación y una alternativa gratuita como máximo ante respuesta de cuota.
- `server/providers/codex-exec.mjs`: proveedor optativo de Codex CLI con salida estructurada. No ejecutar Codex real desde pruebas automatizadas.
- `app/`: interfaz HTML/CSS/JavaScript y escena geométrica Canvas. Los IDs existentes son compatibilidad de datos; el lenguaje visual y de producto usa hormigas/colonia.
- `test/`: pruebas nativas de Node. Ejecutar `npm.cmd run check` y `npm.cmd test` tras cambios relevantes.

## Codex local

La demostración funciona por defecto. Para OmniRoute: `ZOLVANI_ENABLE_OMNIROUTE=1`, base URL local y un modelo gratuito verificado antes de pulsar el botón IA. Cada llamada puede consumir la cuota del proveedor externo; no se presumen límites gratuitos permanentes. Codex CLI queda alternativo, no se inicia en desarrollo ni en pruebas. No se solicitan ni escriben claves en archivos.

## Documentación y cambios

- Mantener `ESTADO_PROYECTO.md`, `REPORTE_DESARROLLO.md` y `NOTAS/Diario-de-desarrollo.md` honestos y sincronizados con pruebas observadas.
- `NOTAS/` contiene Markdown independiente, compatible con QOwnNotes; no alterar ajustes globales ni cuadernos ajenos.
- Beads es la fuente de tareas de desarrollo solo si su base local funciona. No inventar IDs ni sincronizar remotos.
- Conservar MIT, atribuciones de terceros y la marca oficial entregada.
- No crear ramas, commits ni etiquetas mientras `.git` no admita escritura; nunca empujar código sin autorización.
