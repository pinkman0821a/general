# Estado del proyecto — ZOLVANI: LA COLONIA

## Misión 3 — catálogo de productos comerciales (implementado localmente; 2026-10-23)

- Productos nuevas se guardan en el estado JSON local (`data/state.json`, excluido en `.gitignore`); las tareas, fichas demo y celdillas existentes se conservan.
- La vista Productos permite registrar/editar, filtrar, ver procedencia por campo, hallazgos, historial/precios previos, importar plantilla CSV y pedir a Reina una evaluación de una o varias fichas.
- El CSV Zolvani requiere fuentes individuales por dato, fechas compartidas, UTF-8 y campos exactos; límite de 500 filas/2 MB; rechaza fórmulas, URLs con credenciales, importes inválidos y duplicados.
- Financiera calcula con enteros COP adquisición, precio propuesto, flete, comisión, empaque, publicidad y otros costos. Muestra parcial/faltantes, margen y sensibilidad +10%; rechazo/devolución solo si se ingresan tasa y pérdida como supuesto explícito. Un cálculo no significa datos verificados.
- Inspectora revisa campos obligatorios, procedencia, confirmación, antigüedad de 30 días, disponibilidad desconocida, rentabilidad y posibles riesgos regulatorios; nunca marca un producto como listo para vender.
- Reina conserva flujo de máximo cuatro llamadas IA seriales; ficha seleccionada pasa como datos no confiables y se bloquean correos/teléfonos/claves identificables. Financiera recibe resultados deterministas. La cuota de Gemini no se consumió durante el desarrollo.
- Dropi: el sitio oficial presenta catálogo/integraciones y existe `api.dropi.co`, pero su raíz pública no incluye especificación de autenticación, permisos ni lectura de catálogo/precios/inventario. No se sondearon rutas. Una API privada autorizada puede existir; queda pendiente obtener documentación y permiso para la cuenta. Se usa entrada manual, sin scraping/endpoints no documentados. Detalle en [docs/CATALOGO_PRODUCTOS.md](docs/CATALOGO_PRODUCTOS.md).
- Pruebas nuevas: normalización, cálculos y supuestos, CSV/formula injection, API/persistencia/historial, bloqueo HTTP de PII y coordinación simulada. `npm.cmd run check` aprobado; `npm.cmd test` aprobado **56/56**. Sin llamadas externas de IA.
- Versión real continúa `v0.1.0-preview.1`. Sin commit, tag ni push; respaldo y otros repositorios intactos.

## Misión 2 — coordinación de Reina (implementada localmente)

- `POST /api/goals/real` crea objetivo persistente e inicia un huevo real de planificación asignado a Reina.
- Plan validado por programa y limitado a Exploradora (`productos`) → Financiera (`precios`) → Inspectora (`calidad`); dependencias y asignaciones no son decisión final del modelo.
- Cada etapa recibe summary/evidence previas; todas permanecen marcadas como no verificadas comercialmente. Financiera no acepta importes ni porcentajes inventados; informe lista verificaciones pendientes.
- Hasta 4 llamadas por objetivo, serie global de una tarea a la vez, modelo congelado por objetivo, no se encolan objetivos consecutivos y no hay reintento automático. Errores, cuota, cancelación o reinicio detienen el flujo sin reejecutar.
- UI añade formulario propio de objetivo, lista de objetivos y visualización de plan, dependencias, etapas, resultados, estado, historial e tokens reportados; mantiene la creación de un huevo IA individual y el modo demostración.
- Prueba simulada end-to-end aprobada en desarrollo: ver [REPORTE_DESARROLLO.md](REPORTE_DESARROLLO.md). El propietario confirmó después que la coordinación multiagente real con OmniRoute/Gemini completó cuatro llamadas y finalizó Reina, Exploradora, Financiera e Inspectora; en esta misión no se volvió a consumir cuota.
- Versión continúa `v0.1.0-preview.1`; no hubo commit, push ni cambio del respaldo/repositorio general.
- Verificación de esta misión: `npm.cmd run check` aprobado; `npm.cmd test` 43/43 aprobadas con proveedores simulados. Ninguna solicitud de IA externa.

## Corrección más reciente — 2026-10-23

- Causa del primer huevo IA fallido: Zolvani omitía `response_format` en la solicitud OpenAI-compatible y el lector solo manejaba una cadena JSON cruda de `choices[0].message.content`.
- Ahora envía `json_schema` compatible con la traducción Gemini de OmniRoute 3.8.52; acepta bloque Markdown JSON completo, contenido OpenAI en partes, `message.parsed` y objeto estructurado directo, y mantiene validación estricta local.
- Diagnósticos distintos para vacío, JSON inválido, esquema inválido, truncamiento e incompatibilidad de salida estructurada.
- Huevo original `HUEVO-84f23098`: sigue `error`, cuatro entradas de historial, sin resultado. Preservado; no reintentado ni modificado.
- El propietario confirma OmniRoute y Gemini 3.1 Flash Lite operativos en su entorno. No se repitió ninguna solicitud real en esta corrección. La respuesta con el formato nuevo queda por verificar en una única prueba manual posterior.
- Antes de repetir: ejecutar `npm.cmd run check` y `npm.cmd test`; reiniciar el backend, refrescar proveedor, seleccionar el modelo y lanzar una sola vez. Si falla o queda ambiguo, conservar el error sin reintentar.
- Verificación de esta corrección: `npm.cmd run check` aprobado; `npm.cmd test` 34/34 aprobadas, incluida la integración con bloque Markdown controlado. Sin llamadas reales.

**Versión publicada y actual:** `v0.1.0-preview.1` (sin commit, tag ni bump local).
**Actualizado:** 2026-10-23.
**Último commit leído:** `7ce2907`.
**Rama:** `main`; `.git` sigue protegido contra escritura.

## Funciones implementadas

- La demostración local existente se conserva como modo predeterminado; las tareas demo y celdillas ficticias siguen sin proveedores externos.
- La Reina asigna por reglas a una de seis especialidades y el motor serializa una tarea activa, persiste transiciones, resultado, evidencia, error e historial, aplica idempotencia y no repite automáticamente llamadas ambiguas.
- `OmniRouteProvider` integrado con el motor: consulta `GET /v1/models`, manda `POST /v1/chat/completions`, exige respuesta estructurada, registra modelo/proveedor upstream/uso reportado, mapea cuota y respeta timeout y cancelación.
- Zolvani rechaza URLs ajenas a loopback y claves, correos y teléfonos colombianos comunes en las solicitudes IA. No expone la clave de OmniRoute al navegador ni permite herramientas, comandos o acciones comerciales.
- Los modelos deben figurar explícitamente como gratuitos en el catálogo o estar en `OMNIROUTE_FREE_MODELS`, una lista del propietario revisada por condiciones actuales. Se bloquea `auto` y cualquier modelo no elegible. Como máximo se usa una ruta de respaldo declarada gratuita, solo ante error explícito de cuota 402/429.
- El panel muestra conexión, lista de modelos gratuitos elegibles, selección, nombre de proveedor, modo real/demo, hormiga asignada, resultados e historial. Si OmniRoute no tiene una ruta lista, deshabilita la ejecución real y presenta el diagnóstico.
- `CodexExecProvider` permanece como proveedor alternativo independiente. Se selecciona con `ZOLVANI_AI_PROVIDER=codex-exec` y se habilita explícitamente con `ZOLVANI_ENABLE_CODEX=1`.
- Las tareas previas sin marca de modo se migran a simulación conservando sus identificadores. No se cambia la estructura de pedidos/productos.

## OmniRoute instalado y estado del servicio

- Instalado desde el registro oficial como `omniroute@3.8.52` en `.tools\omniroute-global`, con caché npm en `.test-tmp\npm-cache`. La instalación usó 1.176 paquetes; metadatos npm reportan 461.386.234 bytes descomprimidos. No modificó PATH ni instalación/configuración global.
- `node v24.21.0` satisface el rango publicado por OmniRoute; `omniroute.cmd --version` devolvió `3.8.52`.
- El puerto `20128` estaba libre. Se verificó en el código instalado que el valor de bind predeterminado puede ser `0.0.0.0`; se preparó `scripts\start-omniroute.cmd` para forzar `OMNIROUTE_SERVER_HOST=127.0.0.1`, datos bajo `.tools\omniroute-data` y 1 GiB.
- El proceso no pudo arrancar en esta sesión: Node/tsx falló en `os.userInfo()` con `uv_os_get_passwd returned ENOMEM`, incluso al ejecutar directamente `serve --no-open` con host loopback. No se parcheó el paquete ni se debilitó seguridad. El puerto continúa sin listener.
- La ejecución de `.ps1` está bloqueada por la política de Windows. No se cambió esa política; se dejó un lanzador `.cmd` equivalente.
- **Proveedor/modelos conectados en esta sesión: ninguno.** OmniRoute solo fue instalado y la versión CLI confirmada. No se comprobó autenticación, `/v1/models`, cuota ni un proveedor upstream.

## Pruebas ejecutadas

- `npm.cmd run check`: aprobado.
- `npm.cmd test`: **29/29 aprobadas**. Incluye la ruta HTTP/cola completa con OmniRoute simulado, selección gratuita, rechazo de modelos no gratuitos, fallback acotado por cuota, cancelación, timeout, modo sin motor, no reintento, protección de datos personales y compatibilidad de tareas antiguas.
- Ninguna prueba llamó a un modelo real. No hubo uso de cuota ni se presentó salida simulada como real.
- `git diff --check`: aprobado; Git solo mostró avisos de conversión LF→CRLF al tocar archivos en Windows.
- `Get-Volume Z:` no permite leer espacio disponible en este entorno; el espacio libre actual es desconocido. El paquete OmniRoute añade alrededor de 461 MB descomprimidos según sus metadatos.

## Bloqueos y pendientes

1. Probar el lanzador en una consola Windows normal y verificar que `20128` escuche solo en `127.0.0.1`/`::1`.
2. Configurar una ruta gratuita de OmniRoute después de revisar términos, privacidad, cuota y requisitos de cuenta. El catálogo consultado incluye una ruta Pollinations keyless, pero OmniRoute advierte que puede estar indisponible o rechazar clientes; no se considera conectada ni probada en Zolvani. Varias opciones requieren cuenta y clave propia.
3. Elegir un modelo realmente marcado gratis o registrar su ID revisada en `OMNIROUTE_FREE_MODELS`; solo entonces queda habilitado el botón real.
4. Ejecutar una sola tarea real con el propietario presente. Hasta entonces no hay evidencia de respuesta IA externa ni autenticación confirmada.
5. Git continúa en `main`, sin commit/tag nuevo y sin push por restricción de escritura. Beads no pudo inicializar Dolt en el intento previo; no se inventaron tickets. `NOTAS/` queda como Markdown local para QOwnNotes.

## Cómo iniciar

Modo demostración de Zolvani:

```powershell
Set-Location Z:\Zolvani
node server\index.mjs
```

OmniRoute (consola separada; el script fija loopback y datos locales):

```powershell
Set-Location Z:\Zolvani
cmd.exe /c scripts\start-omniroute.cmd
```

Cuando OmniRoute arranque y se haya conectado una ruta gratuita, habilitar Zolvani en una consola aparte:

```powershell
Set-Location Z:\Zolvani
$env:ZOLVANI_ENABLE_OMNIROUTE = '1'
$env:OMNIROUTE_BASE_URL = 'http://127.0.0.1:20128/v1'
# Si la pasarela requiere clave local, capturarla de forma segura en memoria; nunca guardarla en un archivo.
$secret = Read-Host 'Clave local OmniRoute (Enter si no se requiere)' -AsSecureString
if ($secret.Length -gt 0) { $env:OMNIROUTE_API_KEY = [Net.NetworkCredential]::new('', $secret).Password }
# Opcional, solo tras verificar la ID y gratuidad vigentes:
# $env:OMNIROUTE_FREE_MODELS = 'proveedor/modelo-gratuito-verificado'
# $env:OMNIROUTE_MODEL = 'proveedor/modelo-gratuito-verificado'
node server\index.mjs
```

En el panel usa **Actualizar conexión**, selecciona un modelo gratuito elegible y pulsa **EJECUTAR CON IA REAL** una sola vez. Si el proveedor no conecta o no hay modelo gratuito, el motor no crea el huevo real.

**Próximo paso recomendado:** ejecutar `scripts\start-omniroute.cmd` desde Windows fuera de esta sesión controlada, verificar bind loopback y completar una sola tarea IA con un proveedor gratuito y sus términos revisados.
