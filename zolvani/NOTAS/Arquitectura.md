# Arquitectura de Zolvani

## Sistema actual

Node.js nativo sirve la aplicación solo en `127.0.0.1`. El backend persiste cola, resultados, pedidos demo y bitácora en JSON local. El frontend es HTML/CSS/JavaScript y un renderer Canvas geométrico ligero. Los IDs históricos siguen siendo compatibles; los nombres visuales ahora usan hormigas, colonia y hormiguero.

## Cola y Reina

`server/core.mjs` implementa la asignación determinista de cada tipo a su especialista, una tarea activa por vez, prioridad, eventos y la secuencia de estados. Cada huevo guarda historial de transiciones. La Inspectora valida el tipo de datos, no la veracidad de afirmaciones externas.

El motor separa `executionMode: simulation` de la ejecución por proveedor (`omniroute`, `codex-exec`). Huevos de usuario permanecen simulados por defecto. `/api/tasks/real` exige opt-in del servidor, proveedor listo y clave idempotente. La Reina asigna el especialista por regla determinista; no llama al modelo para delegación.

## Proveedor Codex

Se eligió `codex exec` en la versión instalada `codex-cli 0.162.1` para el smoke test de una sola tarea: proceso acotado, no interactivo, JSONL y esquema. Usa `--ephemeral`, `--ignore-user-config`, `--skip-git-repo-check` y `--sandbox read-only`; la carpeta de trabajo es `.test-tmp/codex-workspace`. El adaptador admite timeout, aborto de árbol de procesos en Windows, tope de salida y captura de consumo reportado por el CLI cuando exista. El subproceso recibe una lista permitida de variables de entorno necesarias para ejecutar Windows/Codex; se excluyen explícitamente claves API de ambiente.

El SDK es una alternativa para flujos de Node más ricos; app-server brinda eventos de streaming e interacción, y puede servir después si el panel requiere control incremental. La documentación oficial recomienda `exec` para un trabajo puntual y SDK/app-server para tareas persistentes e integradas al producto. Se eligió `exec` para este smoke test único; si Zolvani pasa a trabajos continuos, app-server será la siguiente interfaz a evaluar. Para esta etapa no se instala dependencia nueva.

La autenticación existente se reutiliza si Codex CLI puede leer el perfil de la cuenta en la sesión Windows; el programa no lee ni copia tokens. La CLI puede rechazar autenticación, permisos o cuota. No se asume que una suscripción tenga cuota ilimitada ni permiso de uso en otras apps.

## Seguridad y evidencia

La simulación demo no llama proveedor. Las tareas IA tienen texto acotado, esquema JSON y ausencia de herramientas/acciones comerciales. OmniRoute solo usa loopback y modelos explícitamente gratuitos; permite un respaldo gratuito configurado solo ante una respuesta clara de cuota. Timeouts y errores ambiguos no se repiten. Si el servidor se reinicia durante una llamada, se marca `necesita_intervencion`. Las celdillas permanecen locales y ficticias. No se habilitan Dropi, WhatsApp, redes ni compras.

Las pruebas automáticas usan proveedor HTTP falso y verifican el flujo de principio a fin. No se ejecutó una llamada real de OmniRoute ni Codex.

## Referencias oficiales

- [Modo no interactivo de Codex](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Codex como plataforma: CLI, SDK y app-server](https://developers.openai.com/blog/codex-as-a-platform)
- [Codex app-server](https://learn.chatgpt.com/docs/app-server)
- [Integrar Sign in with ChatGPT en una app local](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt)
## Proveedores de IA

- `OmniRouteProvider` es el proveedor principal opt-in, separado de `CodexExecProvider`. Habla con `GET /v1/models` y `POST /v1/chat/completions` mediante `fetch` nativo, solo sobre loopback.
- El estado del proveedor se consulta con `GET /api/provider/status`; seleccionar un modelo gratuito es `POST /api/provider/select-model`. Las tareas reales usan `/api/tasks/real` tras comprobar que hay proveedor/modelo listo.
- La Reina asigna por reglas de especialidad existentes; no se ejecuta otra llamada a IA para planificar ni dividir tareas. Concurrencia de 1, sin reintento de errores ambiguos y recuperación en intervención humana si servidor cae.
- Las respuestas JSON del modelo se guardan como `simulated: false`, con identificador de proveedor/modelo, uso de tokens si está disponible, evidencias e historial. Inspectora valida forma y proveedor; no valida hechos externos.
- Los modelos solo se habilitan si OmniRoute marca explícitamente gratuidad o si el propietario confirma el ID y lo lista en `OMNIROUTE_FREE_MODELS`. Una única alternativa configurada en `OMNIROUTE_FALLBACK_MODELS` se prueba ante cuota explícita 402/429.
- El servicio OmniRoute instalado no llegó a iniciarse en el entorno de desarrollo: Node/tsx falló leyendo `os.userInfo()` (`uv_os_get_passwd returned ENOMEM`). La integración queda probada con transporte simulado, no con el servicio local ni una llamada real.
