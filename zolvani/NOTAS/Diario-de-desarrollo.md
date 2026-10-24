# Diario de desarrollo

## 2026-10-23 — Misión 3: catálogo e inteligencia comercial trazable

- **Versión:** `v0.1.0-preview.1`; sin commit/tag/push. Se conserva la coordinación ya comprobada y no se modificaron respaldos.
- **Objetivo:** aceptar datos de producto autorizados, calcular rentabilidad de forma determinista y dar contexto a Reina/Exploradora/Financiera/Inspectora.
- **Tareas relacionadas:** Misión 3, catálogo CSV, motor multiagente de análisis; no se usó Beads por la prioridad del flujo funcional.
- **Archivos:** `server/catalog.mjs`, `server/core.mjs`, `server/index.mjs`, `server/providers/omniroute.mjs`, `app/index.html`, `app/app.js`, `app/styles.css`, `test/catalog.test.mjs`, `test/omniroute-provider.test.mjs`, `package.json`, `README.md`, `CHANGELOG.md`, `ESTADO_PROYECTO.md`, `REPORTE_DESARROLLO.md`, `docs/CATALOGO_PRODUCTOS.md`, `NOTAS/Integraciones-futuras.md`, `NOTAS/Decisiones-tecnicas.md`, `NOTAS/Versiones-y-cambios.md` y este diario.
- **Implementado:** fichas locales con fuente/fecha por valor, confirmación del propietario, edición con historial, importador CSV con plantilla, filtrado, Inspector, cálculos en COP entero, costos faltantes como desconocidos, margen/sensibilidad y supuesto opcional de devoluciones/rechazos. La selección de catálogo alimenta Reina→Exploradora→Financiera→Inspectora; Financiera recibe el cálculo del programa y no puede reportar cifras fuera de la ficha/cálculo.
- **Pruebas:** `npm.cmd run check` aprobado. `npm.cmd test` aprobado, **56/56**. El flujo de Reina, persistencia y API se probaron con proveedor simulado; el bloqueo de datos personales ocurre antes de llamar al proveedor. Ninguna llamada real ni gasto externo.
- **Dropi:** la web oficial presenta catálogo e integraciones; se halló `api.dropi.co`, cuya raíz pública no incluye documentación ni permisos/endpoints de lectura. No se sondearon rutas. Una API privada autorizada puede existir; uso manual hasta obtener documentación/permisos. Términos oficiales limitan automatización indebida/extracción masiva.
- **Pendiente:** prueba única IA de evaluación de producto del propietario; aprobación manual de cada oportunidad; posible consulta autorizada a Dropi; revisar datos del CSV antes de enviarlos a un proveedor IA. No conectados pedidos, compra, canales ni Dropi.
- **Commit:** ninguno; no se intentó escribir Git. Espacio/disponibilidad de disco no medido.

## 2026-10-23 — Misión 2: Reina y coordinación de tres hormigas

- **Versión:** `v0.1.0-preview.1`; se conserva hasta la prueba real externa. Sin commit/push/tag.
- **Objetivo:** transformar huevos individuales en un objetivo IA compuesto con etapas dependientes y entrega conjunta.
- **Beads:** no utilizado; prioridad explícita en funcionalidad.
- **Archivos modificados:** `server/core.mjs`, `server/index.mjs`, `server/providers/omniroute.mjs`, `app/index.html`, `app/app.js`, `app/styles.css`, `test/core.test.mjs`, `test/omniroute-provider.test.mjs`, `CHANGELOG.md`, `ESTADO_PROYECTO.md`, `REPORTE_DESARROLLO.md`, `docs/COORDINACION_REINA.md` y este diario.
- **Funcionalidad:** planificador estructurado Reina, validación de plan dependencias fija, huevos persistidos Exploradora → Financiera → Inspectora, contexto previo propagado, informe final local, pantalla de coordinación y consumo tokens reportado.
- **Controles:** máximo cuatro llamadas, una activa, un objetivo activo, modelo fijado, errores/cancelación/reinicio detienen etapas, no reintentos; guardia contra valores comerciales inventados en Financiera y contra salida con PII/credenciales.
- **Pruebas:** `npm.cmd run check` aprobado; `npm.cmd test` aprobado, 43/43. Incluye flujo end-to-end con proveedor simulado, esquema y plan estructurado, dependencias, persistencia, cuatro llamadas seriales, plan malicioso/inválido, cuota, cancelación, política financiera, privacidad, UI y recuperación sin reejecución.
- **Pendiente:** prueba real única del propietario siguiendo `docs/COORDINACION_REINA.md`. No hubo llamada externa ni cambio al huevo histórico `HUEVO-84f23098`.
- **Commit:** ninguno; respaldo remoto intacto.

## 2026-10-23 — Corrección del contrato JSON OmniRoute/Gemini

- **Versión:** `v0.1.0-preview.1`; sin commit (no se solicitó trabajar Git y no se intentó escribirlo).
- **Objetivo:** reparar la primera salida real asignada a Exploradora sin repetir llamadas externas.
- **Tarea:** depuración del flujo OmniRoute; Beads no utilizado en esta corrección según prioridad explícita del propietario.
- **Archivos modificados:** `server/providers/omniroute.mjs`, `test/omniroute-provider.test.mjs`, `docs/INTEGRACION_OMNIROUTE.md`, `ESTADO_PROYECTO.md`, `REPORTE_DESARROLLO.md` y este diario.
- **Causa:** faltaba `response_format`; la respuesta solo se aceptaba como cadena JSON cruda. El traductor local de OmniRoute 3.8.52 confirma soporte de `json_schema` → `responseMimeType`/`responseSchema` para Gemini.
- **Cambio:** esquema JSON en la solicitud, parser limitado a JSON crudo o único bloque Markdown completo, compatibilidad con partes textuales/objeto parseado/objeto directo y validación estricta con códigos diagnósticos separados.
- **Pruebas:** se observaron fallos RED esperados antes de cambiar el adaptador. `npm.cmd run check` aprobado; `npm.cmd test` aprobado: 34/34. La integración de cola ahora recorre respuesta JSON en bloque Markdown simulado → Inspectora → huevo terminado.
- **Huevo fallido:** `HUEVO-84f23098` observado en `error`, cuatro transiciones, sin resultado. No se cambió ni reintentó.
- **Pendiente:** una prueba real única queda para el propietario con OmniRoute/Gemini ya confirmado, después de reiniciar backend. Compatibilidad real del modelo con el esquema se debe confirmar en esa petición; no se hizo llamada externa en desarrollo.
- **Commit:** ninguno.

## 2026-10-23 — Adaptador y despliegue local de OmniRoute

- **Versión:** `v0.1.0-preview.1`, aún sin commit/tag nuevo por bloqueo de escritura en `.git`.
- **Objetivo:** conectar modelos OmniRoute al motor actual, conservar Codex y no permitir modelos externos con costo incierto.
- **Tareas Beads:** pendientes; `.beads` sigue teniendo el bloqueo histórico de inicialización Dolt. No se inventaron IDs.
- **Archivos modificados:** `server/providers/omniroute.mjs`, `server/core.mjs`, `server/index.mjs`, `app/app.js`, `app/index.html`, `app/styles.css`, pruebas, README, AGENTS, CHANGELOG, ROADMAP, `docs/INTEGRACION_OMNIROUTE.md`, `scripts/start-omniroute.*` y notas.
- **Pruebas:** `npm.cmd run check` aprobado; `npm.cmd test` aprobado, 28/28 (incluye API simulada end-to-end, selección de modelo gratuito, cuota y una alternativa, timeout, cancelación, persistencia y protección contra datos personales). Sin llamadas a modelos reales.
- **OmniRoute:** instalación oficial npm `3.8.52` en prefijo aislado `.tools/omniroute-global` (1.176 paquetes, 461.386.234 bytes descomprimidos según metadatos npm); `--version` mostró `3.8.52`. Node `v24.21.0` satisface engines.
- **Servicio:** puerto 20128 estaba libre. Lanzador fijó `OMNIROUTE_SERVER_HOST=127.0.0.1`, datos dentro de `.tools` y 1 GiB. El proceso no inició: Node/tsx falló con `uv_os_get_passwd returned ENOMEM` en `os.userInfo()`. No se hizo llamada externa. Política de ejecución bloqueó el `.ps1`; se dejó `.cmd` sin cambios de política.
- **Resultado IA:** el adaptador y la cola están conectados a un proveedor simulado verificable; no hay proveedor externo disponible confirmado. La ejecución real y autenticación quedan pendientes.
- **Git:** ningún commit; último commit leído `7ce2907`. `.git` no admite escritura. `.tools/` permanece ignorado por Git.
- **Próximo paso:** desde PowerShell normal, iniciar `scripts\start-omniroute.cmd`, comprobar el bind solo-loopback, conectar un proveedor revisado como gratuito y ejecutar una sola prueba desde el panel.
- **Commit:** ninguno.

## 2026-10-23 — Integración de cola IA, trazabilidad y colonia

- **Versión:** `v0.1.0-preview.1`, sin commit ni nueva etiqueta.
- **Objetivo:** conectar el adaptador existente a la cola sin borrar la demostración; preparar un smoke test Codex seguro y cambiar la representación a hormigas.
- **Beads:** no se crearon tickets porque la inicialización anterior de Beads 1.3.1 falló en Dolt; no se inventaron IDs.
- **Archivos principales modificados:** `server/core.mjs`, `server/index.mjs`, `server/providers/codex-exec.mjs`, `app/app.js`, `app/index.html`, `app/hive3d.js`, `test/core.test.mjs`, README y documentos de estado/arquitectura.
- **Pruebas ejecutadas:** `npm.cmd run check` aprobado; `npm.cmd test` aprobado, 17/17.
- **Resultado observado:** proveedor de prueba completa la ruta HTTP/cola con asignación a Exploradora, estado ejecutando, validación de estructura, entrega, evidencias e historial. Se probaron también idempotencia, ruta apagada, pausa, cancelación y recuperación segura.
- **Codex:** instalado `codex-cli 0.162.1`; revisado `codex exec --help`. No se ejecutó una tarea Codex real en esta sesión. La prueba manual permanece pendiente.
- **Interfaz:** botón IA real, indicadores de modo/proveedor y salida diferenciada. Renderer Canvas con hormigas estilizadas y desplazamiento asociado a los estados reportados.
- **Bloqueos:** `.git` está protegido contra escritura; rama actual `main`, último commit `7ce2907`; sin commit. Beads Dolt no disponible. No se verificó la escena en navegador interactivo.
- **Commit:** ninguno.

## 2026-10-23 — Identidad visual y adaptador inicial

- Se integraron recursos de marca existentes y tokens CSS. Se preparó `CodexExecProvider` aislado y con salida estructurada, todavía sin conexión a cola en ese hito.
- Beads 1.3.1 falló al iniciar Dolt y Git metadata resultó de solo lectura. QOwnNotes MCP no estaba disponible; esta carpeta Markdown permanece utilizable como notas locales sin tocar configuración global.
