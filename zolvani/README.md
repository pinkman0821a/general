# ZOLVANI · LA COLONIA

Aplicación local de comercio electrónico gestionada por una Reina y seis hormigas especializadas. Los huevos representan tareas y las celdillas conservan la estructura de registros comerciales. Los identificadores históricos no cambian. El panel separa las demostraciones de la ejecución IA real.

## Arranque de Zolvani

Requiere Node.js 20 o superior. Desde PowerShell:

```powershell
Set-Location Z:\Zolvani
node server\index.mjs
```

Abre <http://127.0.0.1:4173>. No requiere dependencias NPM. El modo predeterminado es demostración; las tareas simuladas no contactan modelos externos.

## OmniRoute local

OmniRoute necesita Node.js `>=22.22.2 <23` o `>=24 <27`. En este entorno Node `v24.21.0` cumple el requisito. La instalación aislada del proyecto se ubica en `.tools\omniroute-global`; no altera el PATH ni la instalación global del usuario. Iníciala en otra consola:

```powershell
Set-Location Z:\Zolvani
.\scripts\start-omniroute.cmd
```

El script `.cmd` evita depender de que PowerShell permita ejecutar archivos `.ps1`; no cambia la política de seguridad. Configura el servidor con `OMNIROUTE_SERVER_HOST=127.0.0.1`, limita memoria a 1 GiB, guarda datos bajo Z: y se detiene si el puerto ya está ocupado. Comprueba después con `Get-NetTCPConnection -State Listen -LocalPort 20128`; la dirección debe ser `127.0.0.1` o `::1`, nunca `0.0.0.0` o una IP de red. La API OpenAI-compatible usa `http://localhost:20128/v1`. Zolvani rechaza cualquier base URL externa.

Instalar OmniRoute **no crea una cuota gratuita**. Conecta en su panel solo una ruta que hayas verificado como gratuita en sus términos vigentes; varios proveedores gratuitos requieren su propia cuenta o clave y pueden cambiar sus límites. El catálogo actual distingue rutas sin autenticación como Pollinations de proveedores que exigen cuenta/credenciales, pero disponibilidad, condiciones y capacidad del momento deben comprobarse en el panel. El catálogo puede marcar un modelo como gratuito; si el `/v1/models` local no incluye ese dato, se puede confirmar manualmente en el panel y registrar solo el ID revisado en `OMNIROUTE_FREE_MODELS`.

Para habilitar OmniRoute en Zolvani, en una tercera consola:

```powershell
Set-Location Z:\Zolvani
$env:ZOLVANI_ENABLE_OMNIROUTE = '1'
$env:OMNIROUTE_BASE_URL = 'http://127.0.0.1:20128/v1'
# Opcional si OmniRoute activó autenticación de cliente. Captura la clave desde el prompt seguro,
# sin escribirla literal en el historial ni guardarla en archivos del proyecto.
$secureOmniKey = Read-Host 'Clave local de OmniRoute (Enter si no se requiere)' -AsSecureString
if ($secureOmniKey.Length -gt 0) { $env:OMNIROUTE_API_KEY = [Net.NetworkCredential]::new('', $secureOmniKey).Password }
node server\index.mjs
```

En el panel Zolvani, pulsa **Actualizar conexión**. Selecciona un modelo que aparezca marcado explícitamente como gratuito y luego pulsa **EJECUTAR CON IA REAL** o escribe una tarea para la Reina. Si no hay modelo elegible, el botón queda desactivado y la API rechaza la solicitud sin crear un huevo ni generar una respuesta ficticia. La tarea de prueba compara tres categorías como hipótesis: no realiza búsqueda web ni verifica precios, disponibilidad o fuentes. La Reina asigna por reglas del programa y la Inspectora valida estructura; ninguna de las dos confirma la veracidad comercial del resultado.

Cada solicitud externa puede consumir cuota del proveedor conectado. No se reintenta automáticamente ante error, límite, cancelación o interrupción; la cola usa concurrencia máxima uno. No envíes información personal, credenciales ni datos de clientes a modelos externos. Zolvani rechaza claves reconocibles, correos y teléfonos colombianos comunes antes de persistir una tarea IA.

### Modelo gratuito verificado en la pasarela

1. En OmniRoute revisa el proveedor y sus términos, cuota, registro de solicitudes y privacidad.
2. Consulta sus modelos conectados en el Dashboard → Endpoints. Si la respuesta `/v1/models` no contiene información explícita de gratuidad, determina el ID en el catálogo gratuito de OmniRoute y configúralo en la consola del servidor, por ejemplo:

   ```powershell
   $env:OMNIROUTE_FREE_MODELS = 'pollinations/modelo-verificado'
   $env:OMNIROUTE_MODEL = 'pollinations/modelo-verificado'
   ```

3. Si el modelo se marcó como gratuito por la respuesta del catálogo, basta seleccionarlo desde Zolvani. El backend vuelve a consultar los modelos antes de ejecutar y vuelve a bloquear modelos que no estén marcados como gratuitos.
4. El primer botón real envía la tarea de prueba cualitativa. Revisa el resultado verdadero, proveedor upstream, modelo, uso reportado e historial antes de cualquier repetición.

La lista local `OMNIROUTE_FREE_MODELS` es una declaración humana de revisión; no es una certificación automática ni una garantía de que el proveedor no haya cambiado sus términos. Verifica nuevamente antes de cada nueva conexión.

## Codex como proveedor alternativo

`CodexExecProvider` se conserva, independiente de OmniRoute. Para seleccionar explícitamente Codex en PowerShell, inicia Zolvani en una consola nueva con:

```powershell
$env:ZOLVANI_AI_PROVIDER = 'codex-exec'
$env:ZOLVANI_ENABLE_CODEX = '1'
node server\index.mjs
```

La CLI usa `codex exec` efímero, sandbox de solo lectura y tiempo limitado. La autenticación/uso de cuenta no se considera verificado hasta una tarea manual. No se inicia desde pruebas automatizadas. La suscripción de ChatGPT no implica crédito API ilimitado ni da permiso automático a otras aplicaciones.

## Pruebas

```powershell
npm.cmd run check
npm.cmd test
```

Las pruebas usan proveedores HTTP simulados y no llaman a OmniRoute, Codex ni modelos remotos ni consumen cuotas. Una prueba real debe ejecutarse manualmente, una sola vez, con OmniRoute local, un modelo gratuito verificado y el propietario presente.

## Arquitectura y seguridad

- `server/core.mjs`: cola serial persistente, Reina, estados, deduplicación, historial, validación determinista y recuperación sin repetición de llamadas IA.
- `server/providers/omniroute.mjs`: cliente OpenAI-compatible para `GET /v1/models` y `POST /v1/chat/completions`, loopback estricto, selección de modelo libre, timeout, cancelación y errores de cuota.
- `server/providers/codex-exec.mjs`: adaptador independiente `codex exec`, efímero, solo lectura, salida estructurada, timeout y cancelación.
- `server/index.mjs`: backend HTTP y rutas de estado/modelo/tareas; escucha en `127.0.0.1`.
- `app/`: panel de control y escena Canvas ligera de hormiguero.
- `data/state.json`: almacenamiento local de desarrollo, ignorado por Git.

No hay integración Dropi, Firebase, WhatsApp ni redes sociales. No se realizan compras ni pedidos reales.

## Estado, notas y versión

Consulta [ESTADO_PROYECTO.md](ESTADO_PROYECTO.md), [REPORTE_DESARROLLO.md](REPORTE_DESARROLLO.md), [ROADMAP.md](ROADMAP.md) y `NOTAS/`. Los cambios locales no tienen commit ni nueva etiqueta porque `.git` está protegido contra escritura en este entorno; se conserva `v0.1.0-preview.1`.

## Licencia

Este paquete conserva MIT en `LICENSE`. Los componentes y avisos del repositorio externo `Agentes_IA_3D` deben mantener su atribución al integrarse.
