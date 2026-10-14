# Eliminación permanente de servicios

`DELETE /api/servicios/:id` reutiliza sesión, validación de ID y carga de servicio existentes.
Solo coordinador; sin sesión 401, técnicos 403, ID inválido 400, inexistente 404, éxito 200.
Un DELETE posterior a una eliminación completada devuelve 404.
No se devuelven keys de almacenamiento. No se crean tablas ni migraciones.

## Orden y recuperación

1. Consultar fotos y comprobante, incluido comprobante histórico oculto por cambio de tipo.
2. Leer los objetos R2 antes de borrar; conservar bytes y metadatos temporalmente en memoria.
   Máximo cinco fotos y un comprobante, hasta 30 MB de contenido según límites actuales.
   Si la lectura falla, no se inicia la eliminación.
3. Borrar objetos R2 por sus keys privadas generadas previamente por backend.
4. Eliminar el servicio en una escritura D1 condicionada a que las referencias de archivos
   sigan coincidiendo con la copia. La FK existente ON DELETE CASCADE elimina servicio_fotos
   atómicamente con el servicio. No hay una ventana con filas de fotos huérfanas en D1.
5. Si R2 falla o D1 rechaza el borrado, restaurar los objetos todavía referenciados por D1.
   No restaurar archivos que otra operación haya retirado ni archivos de un servicio ya eliminado.
   Un cambio concurrente de archivos devuelve 409 y permite actualizar/reintentar.
6. Si D1 confirmó el DELETE pero perdió la respuesta, comprobar que el servicio ya no existe
   y devolver éxito sin restaurar objetos huérfanos.

R2 y D1 no admiten una transacción conjunta. La compensación cubre fallos aislados probados,
pero no garantiza atomicidad ante caída del Worker o fallos simultáneos persistentes de D1/R2
durante la restauración. En caso de resultado no verificable/restauración fallida se devuelve 500
con aviso de revisión del almacenamiento; no se comunica un éxito falso.
Las copias son temporales, no constituyen una cola durable de recuperación.
Mientras se ejecuta la operación, otro cliente puede observar temporalmente un archivo ausente.
No se crearon recursos remotos ni un sistema adicional de backups/limpieza.

## Interfaz

Detalle y edición del coordinador ofrecen Eliminar servicio con el estilo peligro existente.
Confirmación modal con advertencia irreversible, Cancelar y Eliminar servicio.
Cancelar/Escape no llaman a la API; durante DELETE se bloquean acciones y doble envío mediante ref.
Al completar se cierra el panel, se retira la fila, se recarga el listado/resumen del mes,
se limpia el ID de la URL y se muestra Servicio eliminado correctamente.
Técnico no tiene botón. Crear/editar servicio mantienen sus flujos existentes.

Agenda, Inicio, Finanzas, resumen técnico y Excel continúan consultando las filas actuales;
la eliminación se refleja naturalmente en la siguiente consulta sin cambiar sus reglas.
Las pantallas abiertas en otras sesiones requieren su recarga habitual; no se agregó sincronización en vivo.

## Regresión

Backend: permisos/ID, inexistente/doble DELETE, 0/1/5 fotos, comprobante, ambos, histórico oculto,
aislamiento de otros servicios, FK, listado/Agenda/Inicio/Finanzas/resumen/Excel y edición preservada.
R2 simulado: lectura fallida, borrado parcial, D1 rechazado, commit con respuesta perdida
y upload concurrente; comprobar bytes/metadatos restaurados y ausencia de huérfanos tras éxito.
Frontend: acción solo coordinador, confirmación, cancelación, DELETE autenticado,
doble envío, loading/error, cierre/éxito y acceso a edición.

Validación final: 793 pruebas backend y 141 frontend aprobadas. TypeScript aplicación/tests,
lint, build, check:lines y git diff --check aprobados. git status --short y git diff --stat revisados.
Las pruebas backend usan D1/R2 aislados; no se aplicaron migraciones ni operaciones remotas.

## Archivos de esta corrección

Creados: `backend/src/services/servicioEliminacion.ts`,
`backend/test/servicioEliminacion.spec.ts`, `backend/test/servicioEliminacionFallos.spec.ts`,
`frontend/src/components/servicios/EliminarServicio.tsx`,
`frontend/test/servicioEliminacion.test.cjs` y este documento.

Modificados: `backend/src/index.ts`, `backend/src/routes/servicios.ts`,
`frontend/src/services/serviciosService.ts`, `frontend/src/components/servicios/useServicios.ts`,
`frontend/src/pages/ServiciosPage.tsx`, `frontend/src/components/servicios/DetalleServicio.tsx`
y `frontend/src/components/servicios/FormularioServicio.tsx`.
Los cambios previos de otras etapas se conservaron.
