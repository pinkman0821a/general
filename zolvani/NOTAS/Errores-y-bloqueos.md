# Errores y bloqueos

## Beads / Dolt embebido

`bd version` funciona y muestra `1.3.1`, pero `bd init --quiet --skip-agents --skip-hooks --non-interactive --prefix zol` abortó al inicializar su base Dolt local. El proceso informó que no pudo cargar la configuración de base de datos y terminó con `nil pointer dereference` en `DoltCliConfig.createLocalConfigAt`. Solo dejó `.beads/.gitignore` y carpetas vacías bajo `.beads/embeddeddolt/zol/.dolt`; no existe una base previa en el proyecto. No se reintentó la inicialización ni se borraron esos restos.

`bd prime` no puede cargar el espacio activo porque la base no existe. `bd setup codex --check` indicó que falta la skill de Beads; no se ejecutó la instalación porque la configuración de agentes se apoya en `.agents`, que el entorno marca como solo lectura. Las instrucciones originales de `AGENTS.md` se conservaron.

## Git

`git switch -c feature/identidad-y-motor-ia` falló al crear `refs/heads/feature/...`: `.git` está montado con permiso de lectura. El commit y la etiqueta también quedan bloqueados por esa misma restricción. No se intentó alterar permisos ni solicitar bypass.

`git remote -v` no mostró remotos configurados, así que no hay un `upstream` establecido para el proyecto externo.

## QOwnNotes

No hay conector MCP de QOwnNotes en las herramientas disponibles. No se leyó ni cambió la configuración del usuario. `NOTAS/` es Markdown independiente y se puede agregar manualmente en QOwnNotes.

La extracción temporal de revisión del ZIP quedó en `.wrangler/logo-kit-inspect`. La política del entorno rechazó el comando de limpieza recursiva; el directorio se conserva dentro del proyecto y no contiene cambios del producto.
# Bloqueos OmniRoute — 2026-10-23

- La instalación npm oficial `3.8.52` está bajo `Z:\Zolvani\.tools\omniroute-global`; 1.176 paquetes y 461,386,234 bytes descomprimidos en metadatos. No se modificó npm global ni PATH.
- El comando `omniroute.cmd --version` funciona y mostró `3.8.52`.
- `omniroute.cmd --help` y el arranque local terminan con `uv_os_get_passwd returned ENOMEM` al invocar `os.userInfo()` dentro de `tsx`. Es un bloqueo de esta sesión Windows controlada; no se parcheó la dependencia ni se desactivó seguridad.
- Puerto `20128` libre al comprobar. Sin servicio escuchando, no se probaron el endpoint, la clave local ni proveedor/modelos.
- La ejecución de `.ps1` está bloqueada por la política local; se agregó `scripts\start-omniroute.cmd` para no cambiarla.
- No se puede confirmar qué endpoint gratis hay autorizado ahora. No se hizo tarea externa ni se gastó cuota.
