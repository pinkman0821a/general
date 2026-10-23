# Organización del trabajo

Beads debe ser la fuente de verdad de tareas de desarrollo cuando vuelva a estar operativo. Esta nota no mantiene una lista paralela: registra que la inicialización de Beads está bloqueada por el fallo Dolt documentado en [Errores y bloqueos](Errores-y-bloqueos.md). Usa `bd ready`, `bd update --claim`, dependencias explícitas y cierre con evidencia. No sincronices a remotos.

El trabajo comercial representado por huevos en la aplicación permanece separado de los tickets de desarrollo de Beads.
# Próxima tarea técnica

1. Iniciar OmniRoute desde una consola normal con `scripts\start-omniroute.cmd` y comprobar que `20128` escucha exclusivamente en loopback.
2. Revisar términos y cuota del proveedor desde OmniRoute; conectar una ruta que no requiera método de pago y cuya gratuidad actual sea clara.
3. Configurar `OMNIROUTE_API_KEY` solo en memoria de la consola si OmniRoute exige clave y marcar modelos gratuitos si el catálogo no lo especifica.
4. En Zolvani actualizar conexión, seleccionar un modelo gratuito y ejecutar una sola tarea; conservar el resultado en el historial.
5. Si falla `os.userInfo()`, revisar permisos de la sesión Windows de forma normal; no modificar `node_modules` ni relajar políticas.
