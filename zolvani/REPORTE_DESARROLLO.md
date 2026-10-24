# Reporte de desarrollo — OmniRoute en Zolvani

## Misión 2: coordinación multiagente de la Reina (2026-10-23)

**Versión local:** `v0.1.0-preview.1` — no se avanzó a `preview.2` ni se modificó Git. El respaldo remoto y `C:\GitHub\general` no se tocaron.

**Implementado:** nuevo flujo local `POST /api/goals/real`, persistencia de objetivos en `data/state.json`, huevo de planificación de la Reina y tres huevos derivados (Exploradora → Financiera → Inspectora). El plan debe cumplir tipos permitidos, títulos/instrucciones acotados y dependencias exactas; IDs, asignaciones y ejecución los fija el programa, nunca el modelo. Cada hormiga dependiente recibe summary/evidence de sus precedentes con la marca de que la validación estructural no verifica hechos de mercado. La Financiera rechaza cantidades/porcentajes comerciales no verificados. Inspectora valida salida y proveedor; la Reina compone el informe final sin una quinta llamada.

**Límites y controles:** máximo cuatro llamadas por objetivo (una planificación y tres etapas), cola serial de concurrencia uno, objetivo único activo, mismo modelo elegido fijado en todos los huevos, proveedor gratuito revalidado en cada solicitud y cero reintentos automáticos. Error, cuota, cancelación, salida inválida o reinicio detienen las dependencias. Entregas que parecen contener credenciales/datos personales se descartan. No hay herramientas, navegación, comandos ni acciones comerciales; presupuesto gastado permanece en cero y token usage solo se suma cuando el proveedor lo reporta.

**Interfaz:** panel de Huevos permite escribir el objetivo, iniciar IA real solo si el proveedor está habilitado, ver el plan, huevos, hormigas, estados, dependencias, resultados, informe, historial y tokens reportados; se conserva el formulario de huevo IA individual. El mapa existente recibe los estados de tarea desde el motor.

**Verificación:** `npm.cmd run check` aprobado; `npm.cmd test` **43/43 aprobadas**. Las pruebas con proveedor simulado cubren planificación estructurada, asignación, transferencia de contexto, dependencias, persistencia, cuatro llamadas seriales, resultado financiero conservador, rechazo de plan, error, cuota, cancelación, datos sensibles y recuperación sin repetir. No se ejecutó Gemini/OmniRoute real en este desarrollo.

**Prueba externa pendiente:** confirmar con el propietario OmniRoute/Gemini y su modelo gratuito ya seleccionado. En Huevos, enviar una sola vez el objetivo de aceptación descrito en [docs/COORDINACION_REINA.md](docs/COORDINACION_REINA.md). El flujo puede consumir hasta cuatro llamadas del límite gratuito, aunque Zolvani no facture ni autorice gasto. Si alguna etapa falla/queda ambigua, no repetir automáticamente; conservar objetivo e historial.

---

## Actualización: corrección del primer huevo IA (2026-10-23)

**Versión:** `0.1.0-preview.1`; no se cambió versión ni se creó commit.

**Causa comprobada en el código:** `OmniRouteProvider` enviaba mensajes que pedían JSON en lenguaje natural, pero omitía `response_format`. Luego asumía que `choices[0].message.content` sería una sola cadena con JSON crudo. Un resultado Gemini válido en modo texto o con un bloque Markdown acababa en el mismo error genérico. OmniRoute 3.8.52 instalado localmente contiene un traductor OpenAI→Gemini que convierte `response_format.type=json_schema` a `generationConfig.responseMimeType=application/json` y `responseSchema`; la documentación de OmniRoute marca la salida estructurada como dependiente de la capacidad de cada upstream. La compatibilidad de la traducción está comprobada; la respuesta concreta del modelo Gemini con esta nueva solicitud aún no se ha repetido.

**Corrección:** Zolvani ahora transmite un esquema JSON simple (`summary`, `evidence`) mediante `response_format: json_schema`; acepta el formato OpenAI de contenido en partes, `message.parsed`, un objeto estructurado directo en `message.content` y un único bloque Markdown JSON completo. Mantiene rechazo estricto de prosa alrededor del bloque, JSON inválido, claves extra, campos faltantes, límites de tamaño y truncamiento. Los errores quedan diferenciados como respuesta vacía, JSON inválido, esquema incorrecto, salida truncada o formato rechazado por la pasarela/upstream. No se rebajó la comprobación de la Inspectora.

**Huevo preservado:** `HUEVO-84f23098` continúa en `error`, con cuatro transiciones históricas y sin resultado; no se reescribió ni reintentó. Según la confirmación del propietario, OmniRoute 3.8.52 y Gemini 3.1 Flash Lite sí están disponibles en su entorno. Durante esta corrección no se hizo una nueva llamada externa ni se consumió cuota.

**Pruebas nuevas:** se cubren esquema enviado, bloque Markdown JSON, prosa envolvente, clave extra, contenido en partes, objeto parseado, respuesta vacía, JSON inválido, esquema inválido, truncamiento y rechazo HTTP del formato estructurado. La integración de motor también procesa ahora una respuesta Markdown simulada, la valida con Inspectora y termina el huevo. `npm.cmd run check`: aprobado. `npm.cmd test`: **34/34 aprobadas**. Todas usan respuestas controladas; no hubo llamada externa.

**Una única repetición real, después de reiniciar el backend:** mantener OmniRoute en loopback, iniciar Zolvani con su configuración local vigente, refrescar conexión, seleccionar el mismo modelo Gemini ya habilitado y enviar una sola vez el huevo fallido (o crear uno nuevo con la prueba fija). No ejecutar otro huevo si el primer resultado falla o queda ambiguo. Inspeccionar resultado, modelo, evidencia y validación de Inspectora. El huevo histórico se conserva como evidencia y no se convierte automáticamente en completado.

Fuentes técnicas: [traductor OpenAI-compatible de OmniRoute](https://github.com/cheaper-inference/OmniRoute/wiki/Openai-Compatibility) y [salidas estructuradas de Gemini](https://ai.google.dev/gemini-api/docs/structured-output).

---

**Fecha:** 2026-10-23  
**Versión inicial y final:** `v0.1.0-preview.1` (sin versión nueva ni commit)  
**Último commit:** `7ce2907`  
**Resultado principal:** motor e interfaz conectados a un `OmniRouteProvider`, integración simulada probada; servicio real instalado pero no iniciado en este entorno y ninguna llamada a modelo real.

## Cambios implementados

- Nuevo `server/providers/omniroute.mjs`: protocolo OpenAI-compatible con `/v1/models` y `/v1/chat/completions`, base URL limitada a `localhost`, `127.0.0.1` o `::1`, clave opcional de backend, salida JSON validada, señales de cuota, timeout y cancelación.
- El proveedor solo ejecuta modelos expresamente marcados gratis o incluidos por el propietario en `OMNIROUTE_FREE_MODELS` tras verificar sus términos. Los alias `auto` se bloquean. Se permite un único modelo alternativo previamente verificado como gratuito ante cuota 402/429; timeouts y fallos ambiguos no reintentan.
- El backend expone estado del proveedor y selección de modelo. `/api/tasks/real` se bloquea si el proveedor está desconectado o no existe modelo elegible. Las tareas guardan modo, proveedor, modelo, uso reportado, resultado, evidencia, error e historial.
- La Reina asigna por especialidad determinista a Exploradora, Financiera, Creativa, Vendedora, Inspectora o Guardiana. Los prompts incluyen instrucciones por rol y rechazan herramientas, navegación, comandos y acciones comerciales. La Inspectora comprueba estructura y trazabilidad, no los hechos externos.
- El panel incorpora conexión/modelo de OmniRoute, selección de modelo gratuito, mensaje de cuota/desconexión, botón IA real, resultados verdaderos marcados por proveedor, hormiga responsable e historial. La demostración predeterminada se conserva.
- `CodexExecProvider` se conserva como alternativa independiente. No se inició Codex recursivo.
- Se añadió un bloqueo previo a persistencia para claves reconocibles, correos y teléfonos móviles colombianos comunes. Las tareas antiguas sin marca de modo se interpretan como simulaciones y mantienen su ID.
- Instalador aislado `scripts/start-omniroute.cmd`: usa `OMNIROUTE_SERVER_HOST=127.0.0.1`, datos en `.tools/omniroute-data`, puerto 20128 y memoria de 1 GiB; verifica que el puerto no esté ya ocupado. No cambia la política PowerShell. La guía está en [docs/INTEGRACION_OMNIROUTE.md](docs/INTEGRACION_OMNIROUTE.md).

## Instalación y diagnóstico externo

- GitHub oficial mostraba `release/v3.8.53`, pero al consultar el registro NPM el 2026-10-23 la última versión publicada era `omniroute@3.8.52`. Se instaló `3.8.52` en `.tools/omniroute-global`, con caché bajo `.test-tmp`; npm informó 1.176 paquetes y su metadato informa 461.386.234 bytes descomprimidos. No se modificó PATH ni configuración global. El runtime instalado es Node `v24.21.0`, dentro de su rango `>=24 <27`.
- El comando local `omniroute.cmd --version` imprimió `3.8.52`. No había listener en el puerto `20128`.
- El arranque con `OMNIROUTE_SERVER_HOST=127.0.0.1` y `serve --no-open` falló antes de iniciar por `uv_os_get_passwd returned ENOMEM` en `os.userInfo()` llamado por tsx. `omniroute.cmd --help` presentó el mismo fallo. El intento del lanzador `.ps1` fue impedido por la política local de ejecución. No se relajaron políticas, no se editó `node_modules`, no se inició un servicio parcialmente.
- La API local `/v1/models` no llegó a responder. No hay proveedores ni modelos configurados/confirmados para esta ejecución.
- OmniRoute cataloga proveedores gratuitos, pero esas rutas no son cuotas que OmniRoute otorgue: pueden requerir cuenta, clave, aprobaciones o tener límites variables. El catálogo actual presenta Pollinations como keyless, pero advierte que disponibilidad y aceptación de clientes terceros no están garantizadas. El servicio debe mostrar modelo conectado y gratuito antes de enviar la prueba.

## Pruebas

- `npm.cmd run check`: aprobado.
- `npm.cmd test`: **29/29 aprobadas** en la ejecución final, posterior al endurecimiento que bloquea todos los alias `auto` incluso si se incluyen accidentalmente en la allowlist.
- `git diff --check`: aprobado; emitió avisos de conversión LF→CRLF de Windows, sin whitespace errors.
- La suite incluye integración end-to-end de HTTP/cola con fetch falso: Reina asigna, OmniRoute simulado devuelve JSON, Inspectora valida, y tarea guarda proveedor upstream, modelo, uso, resultado e historial.
- Casos cubiertos: sin modelo gratuito no se persiste ni simula éxito; selección acepta gratis y rechaza un modelo comercial; fallback se limita a un solo modelo gratuito por cuota explícita; timeout, cancelación, error, duplicados, concurrencia, pausa, recuperación sin reintento, credenciales/datos personales y compatibilidad con tareas antiguas.
- Las pruebas no conectan a OmniRoute, no ejecutan Codex ni consumen cuota.

## Funcionalidad real frente a pendiente

**Comprobado en esta sesión:** instalación y versión de la CLI; lógica local de Zolvani; asignación por roles; API; proveedor OmniRoute simulado; validación, historial, persistencia, cancelación, seguridad de loopback, bloqueo de pago por falta de indicador gratis y modo de demostración. La salida HTTP del modelo es ficticia solo dentro del doble de prueba.

**No comprobado/real:** servidor OmniRoute en funcionamiento, conexión con proveedor, clave/autorización, cuota, modelos gratuitos disponibles, respuesta externa de IA. La UI no puede mostrar “IA real lista” hasta haber recibido catálogo y seleccionado un modelo gratuito. No se ejecutó la prueba propuesta; hace falta una consola Windows normal y una ruta gratuita configurada. No hay navegación web ni verificación comercial.

## Versionado y gestión

- `package.json` conserva `0.1.0-preview.1`. No se creó `preview.2`, commit, etiqueta ni push: `.git` sigue de solo lectura en este entorno. No se ocultaron cambios existentes ni se ejecutaron operaciones destructivas.
- `.tools/` está ignorado para no versionar el paquete, credenciales o DB de OmniRoute. El directorio `data/` actual de Zolvani no fue vaciado.
- Beads mantiene el bloqueo histórico de inicialización Dolt; no se inventaron tickets. `NOTAS/` mantiene el diario Markdown para abrir en QOwnNotes.
- No se pudo medir espacio libre en Z: `Get-Volume` devolvió acceso denegado. El metadato de tamaño descomprimido de OmniRoute es ~461 MB.
- No se creó pedido, compra, publicidad, mensaje ni uso comercial.

## Cómo probar fuera de esta sesión

1. En una consola, ejecutar `cmd.exe /c scripts\start-omniroute.cmd` desde `Z:\Zolvani`.
2. Confirmar con `Get-NetTCPConnection -State Listen -LocalPort 20128` que la dirección sea `127.0.0.1` o `::1`. Abrir el dashboard local y conectar solo un proveedor sin costo actual confirmado, sin tarjeta ni saldo comercial.
3. En otra consola iniciar Zolvani con `ZOLVANI_ENABLE_OMNIROUTE=1`, `OMNIROUTE_BASE_URL=http://127.0.0.1:20128/v1` y, si se requiere, la clave del router en la variable del proceso (nunca en archivos).
4. Actualizar conexión en Zolvani, elegir un modelo que figure gratis y ejecutar **una sola vez** la tarea de prueba cualitativa de categorías. No incluir datos personales.
5. Revisar modelo, proveedor upstream, uso reportado, resultado e historial. Si falla, conservar el error y no pulsar de nuevo sin entender si hubo consumo.

El estado detallado y las instrucciones persistentes están en [ESTADO_PROYECTO.md](ESTADO_PROYECTO.md), [NOTAS/Diario-de-desarrollo.md](NOTAS/Diario-de-desarrollo.md) y [README.md](README.md).
