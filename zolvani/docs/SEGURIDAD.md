# Modelo de seguridad inicial

- Aplicación únicamente local: se escucha en `127.0.0.1`, no en todas las interfaces.
- No hay inicio de sesión. **Nunca exponer a Internet, red local ni túneles públicos** en este estado.
- La API valida el encabezado Host, compara Origin en POST y limita solicitudes JSON.
- Los campos de texto se recortan/validan y se escapan al mostrarlos en HTML.
- El simulador no contiene credenciales, tokens, clientes reales, conexión con servicios comerciales ni pago automático.
- El archivo `data/state.json` se excluye de Git; guarda solo datos DEMO. Bórralo solo si deseas eliminar tus pruebas, con el programa detenido.
- Presupuesto guardado: $130.000 COP iniciales; gasto registrado $0, **no representa saldo bancario ni una cuenta real**.
- La comprobación de Inspectora valida la presencia de evidencia y marcas DEMO; NO garantiza calidad real ni exactitud comercial.
- Cuando se habiliten usuarios o se despliegue en línea, necesitará autenticación, autorización por rol, cifrado/retención de datos y revisión de reglas Firebase/almacenamiento.
- Si se incorpora Codex, evaluar la superficie de permisos en procesos y evitar ejecuciones con control irrestricto del sistema.
