# Integración local de OmniRoute

Referencias oficiales revisadas: [repositorio y guía de instalación](https://github.com/cheaper-inference/OmniRoute), [guía de free tiers](https://github.com/cheaper-inference/OmniRoute/blob/release/v3.8.53/docs/getting-started/FREE-TIERS-GUIDE.md) y [paquete publicado en NPM](https://www.npmjs.com/package/omniroute).

La interfaz de Zolvani usa `GET /v1/models` y `POST /v1/chat/completions` en el backend. `server/providers/omniroute.mjs` no depende de SDKs y rechaza cualquier destino que no sea HTTP loopback. OmniRoute puede exigir su clave local; Zolvani la lee solo de `OMNIROUTE_API_KEY` en el proceso del servidor y nunca la entrega al navegador.

## Respuesta estructurada y diagnóstico

Zolvani envía `response_format.type = json_schema` con un esquema de objeto que exige exactamente `summary` (texto) y `evidence` (lista de textos). La validación local aplica límites y rechaza claves adicionales aunque la pasarela/modelo las devuelva. En el paquete instalado OmniRoute `3.8.52`, `open-sse/translator/request/openai-to-gemini.ts` traduce `json_schema` a `generationConfig.responseMimeType = application/json` y `generationConfig.responseSchema`. Eso confirma que la capa de traducción Gemini soporta la solicitud; la ruta upstream concreta aún puede rechazarla y se informará explícitamente.

El parser solo extrae JSON crudo o un único bloque Markdown completo (` ```json ... ``` `), nunca JSON incrustado en prosa. También acepta el contenido en partes textuales OpenAI, `message.parsed` y un objeto estructurado directo en `message.content`. Los diagnósticos diferenciados son `OMNIROUTE_EMPTY_RESPONSE`, `OMNIROUTE_INVALID_JSON`, `OMNIROUTE_INVALID_SCHEMA`, `OMNIROUTE_TRUNCATED` y `OMNIROUTE_FORMAT_UNSUPPORTED`. No hay reintento automático ante ninguno de estos errores.

## Instalación revisada

GitHub publicó la rama estable `release/v3.8.53`; el registro NPM consultado el 2026-10-23 ofrecía `omniroute@3.8.52`, compatible con `Node >=22.22.2 <23 || >=24 <27`. La máquina usaba `Node v24.21.0`. La versión `3.8.52` se instaló en `.tools/omniroute-global`, con caché npm en `.test-tmp/npm-cache` y sin editar configuración global, PATH ni `package.json` de Zolvani. NPM informó `added 1176 packages`; el metadato de distribución reporta 461,386,234 bytes descomprimidos.

El código distribuido resuelve el bind mediante `OMNIROUTE_SERVER_HOST`; su valor de reserva es `0.0.0.0`. Por eso no iniciar el servidor sin `OMNIROUTE_SERVER_HOST=127.0.0.1`. `scripts/start-omniroute.cmd` fija el host, puerto `20128`, un límite de memoria de 1 GiB y `DATA_DIR` dentro de `.tools/omniroute-data`. El script aborta si detecta que el puerto ya está ocupado y no desactiva la política de ejecución de PowerShell.

## Modelos gratuitos y cuotas

El catálogo `/v1/models` estándar puede omitir el precio del upstream. El adaptador solo habilita objetos que OmniRoute marca con `free`, `hasFree`, `freeTier` o precios cero explícitos, y modelos cuya ID se incluyó en `OMNIROUTE_FREE_MODELS` tras una revisión humana en el panel de proveedores/tiers gratuitos. Nunca usa `auto`, `auto/cheap` ni una ruta que no figure elegible como gratuita.

Se puede declarar una ID de respaldo con `OMNIROUTE_FALLBACK_MODELS`. La aplicación acepta solo un respaldo, exige que también aparezca gratuito en el catálogo/allowlist y lo intenta únicamente si la primera ruta devuelve HTTP 402/429 o un error textual explícito de cuota. No hay fallback ante timeout, autenticación, desconexión o error ambiguo. Esto limita llamadas extra; no garantiza que un proveedor no haya procesado una solicitud que respondió tarde.

Una marca `free` no es una promesa de disponibilidad, privacidad ni cuota ilimitada. El propietario debe revisar condiciones y límites del proveedor antes de seleccionarlo. OmniRoute dice expresamente que las cuentas y cuotas gratuitas son conexiones de cada proveedor, no crédito suministrado por OmniRoute. La capacidad keyless puede ser nula o rechazar clientes de terceros.

## Habilitación y primera tarea

1. Abre una consola para OmniRoute y ejecuta `scripts\start-omniroute.cmd`.
2. Revisa que `Get-NetTCPConnection -State Listen -LocalPort 20128` muestre solo `127.0.0.1` o `::1`. Abre el dashboard en `http://127.0.0.1:20128` y conecta solo una ruta que hayas revisado como gratuita. No uses proveedores con prueba de pago, tarjeta, crédito comercial o costo incierto.
3. En otra consola configura `ZOLVANI_ENABLE_OMNIROUTE=1` y `OMNIROUTE_BASE_URL=http://127.0.0.1:20128/v1`. Si la pasarela requiere clave local, configúrala en esa sesión usando captura segura de PowerShell; no la guardes en archivos.
4. Ejecuta `node server\index.mjs`, abre Zolvani y usa **Actualizar conexión**. Elige solo un modelo con etiqueta gratuita. Si no hay ninguno disponible, el modo real queda bloqueado.
5. Pulsa una vez **EJECUTAR CON IA REAL**. La solicitud cualitativa de categorías es la primera prueba; revisa huevo, modelo, proveedor, uso reportado, resultado e historial. No es una investigación web ni una verificación comercial.

## Resultado de la prueba local en esta sesión

- Las pruebas simuladas recorren HTTP, cola, respuesta JSON, Inspectora e historial; no llaman al proveedor y no consumen cuota.
- La instalación terminó y `omniroute.cmd --version` imprimió `3.8.52`.
- El puerto `20128` estaba libre.
- `omniroute.cmd --help` y el inicio del servidor no se pudieron validar en este entorno: Node falló en `os.userInfo()` con `uv_os_get_passwd returned ENOMEM`. No se inició un servicio ni se llamó a un proveedor externo. El archivo `.ps1` también fue bloqueado por la política de ejecución local; se añadió un lanzador `.cmd` que no cambia esa política. Probarlo desde una consola Windows normal y confirmar siempre el bind local antes de conectar Zolvani.
- No se comprobó ningún proveedor gratuito configurado ni se ejecutó una tarea IA real.

### Corrección posterior del primer huevo

El propietario confirmó que OmniRoute 3.8.52 estaba iniciado y que Gemini 3.1 Flash Lite respondía desde el panel. La causa de la falla en Zolvani fue que el cliente omitía `response_format` y exigía contenido en una sola cadena JSON; por ello el mensaje genérico no permitía distinguir entre prosa, Markdown u otra forma de salida. Tras la corrección se solicita `json_schema`, se valida estrictamente la estructura y se admiten solo las representaciones OpenAI textuales equivalentes descritas arriba. La suite aprobó `npm.cmd run check` y `npm.cmd test` (34/34) sin llamadas externas antes de repetir una única ejecución real desde el panel.
