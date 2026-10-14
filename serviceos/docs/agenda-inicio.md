# Agenda e Inicio reales del coordinador

## Endpoints y fuentes

- `GET /api/agenda?mes=YYYY-MM`: mes completo, fecha de hoy y técnicos por día con estado,
  motivo manual, servicios presenciales y remotos.
- `GET /api/inicio/resumen`: fecha actual en Colombia, cuatro KPIs, hasta cinco servicios
  de hoy (ID ASC) y estado de los técnicos activos.

Ambos exigen sesión de coordinador (401 sin sesión, 403 para técnico), tienen
`Cache-Control: no-store` y consultan exclusivamente D1. El mes de Agenda valida formato,
rango y duplicados. Inicio calcula hoy en `America/Bogota`, sin fechas enviadas por el cliente.
Los detalles no exponen teléfono, dirección, comprobantes ni importes financieros.

Una lectura D1 batch consulta usuarios, servicios e indisponibilidades del intervalo.
No hay peticiones por técnico/día desde React, escrituras, migraciones ni datos de ejemplo.
La operación se calcula con `construirDiaAgenda` y `estadoTecnicoDia` para ambas pantallas.

## Disponibilidad y colores

Prioridad diaria:

1. Indisponibilidad manual: rojo, motivo real cuando existe. Conserva el bloqueo duro existente.
2. Dos o más presenciales: rojo intenso, sobrecarga visual. No introduce un límite nuevo.
3. Un presencial: azul, tipo y ciudad de ese servicio.
4. Cero presenciales: verde, disponible.

Garantía, servicio presencial e instalación ocupan agenda. Servicio remoto e instalación
remota aparecen separados en detalle y como indicador secundario en PC; no quitan disponibilidad.
Todos los estados del servicio se mantienen visibles para su fecha programada.
Técnicos activos aparecen todos los días. Los inactivos con asignación aparecen en el día de su
servicio, con la indicación Inactivo, y no se cuentan como técnicos libres.

## Pantallas y navegación

Agenda: calendario Dom–Sáb, anterior/siguiente, input month, marca de hoy, leyenda y selección
de día/técnico. El detalle muestra fecha, tipo, cliente, máquina, ciudad y estado, con enlace al
servicio exacto mediante `/servicios?mes=YYYY-MM&servicio=ID`.
En móvil conserva siete columnas con indicadores; técnicos y trabajos se muestran en detalle vertical.

Inicio: KPIs de servicios de hoy, en proceso hoy, realizados hoy y técnicos activos libres hoy.
La lista muestra hasta cinco servicios sin horas inventadas, enlaces exactos, Ver agenda y
Ver todos los servicios cuando existen más. Estado de técnicos usa los mismos resultados de Agenda.
Los KPIs de estados abren Servicios con mes y filtro de estado (el listado cubre ese mes).
Crear servicio navega a `/servicios?nuevo=1`, abre el formulario solo para coordinador y limpia
ese parámetro al cerrar/guardar conservando el resto de la URL.
En móvil: KPIs de dos columnas y bloques de una columna, sin desplazamiento horizontal obligatorio.

Las pantallas manejan carga, error, reintento y respuestas antiguas al cambiar de mes.
Los estados vacíos no contienen ejemplos ni números de respaldo.
Se eliminó `frontend/src/data/dashboardData.ts`; el menú estático está en `data/menuPrincipal.ts`.
Finanzas, Excel, comprobantes y las reglas de comisión no fueron modificados.

## Archivos de esta tarea

Creados:

- backend/src/routes/agenda.ts
- backend/src/services/agendaCalculo.ts
- backend/src/services/agendaConsulta.ts
- backend/test/agenda.spec.ts
- frontend/src/services/agendaService.ts
- frontend/src/components/operacion/useOperacion.ts
- frontend/src/components/operacion/agendaAyudas.ts
- frontend/src/components/operacion/SelectorMesAgenda.tsx
- frontend/src/components/operacion/CalendarioAgenda.tsx
- frontend/src/components/operacion/DetalleDiaAgenda.tsx
- frontend/src/data/menuPrincipal.ts
- frontend/src/styles/operacion.css
- frontend/src/styles/agenda.css
- frontend/test/operacionAyudas.cjs
- frontend/test/agendaPantalla.test.cjs
- frontend/test/inicioPantalla.test.cjs
- frontend/test/operacionInteraccion.test.cjs
- frontend/test/serviciosEnlaces.test.cjs
- docs/agenda-inicio.md

Modificados:

- backend/src/index.ts
- frontend/src/pages/InicioPage.tsx
- frontend/src/pages/AgendaPage.tsx
- frontend/src/pages/ServiciosPage.tsx
- frontend/src/components/StatsGrid.tsx
- frontend/src/components/AgendaPanel.tsx
- frontend/src/components/TechniciansPanel.tsx
- frontend/src/components/QuickAction.tsx
- frontend/src/components/Sidebar.tsx
- frontend/src/components/servicios/useServicios.ts

Eliminado: frontend/src/data/dashboardData.ts (datos mock; navegación conservada).
Los demás cambios previos del workspace permanecen intactos.

## Pruebas y comprobación local

Backend: D1 real, permisos, meses, disponibilidad, motivos, cinco tipos, manual prioritario,
sobrecarga, inactivos, orden, aislamiento por fecha/mes, KPIs, máximo cinco filas y consistencia.
Frontend: calendario, selector, hoy, leyenda, estados, remotos, detalle, enlaces, filtros,
apertura/cierre/guardado desde nuevo=1, responsive, carga/error/reintento y aborto de consultas.

1. Iniciar backend con `npm.cmd run dev -- --local` y frontend con `npm.cmd run dev`.
2. Como coordinador, abrir Inicio con servicios programados hoy y comparar con Agenda.
3. Revisar día con un presencial, sobrecarga confirmada, remoto y bloqueo manual existentes.
4. Abrir el servicio desde Agenda/Inicio y verificar ID y mes.
5. Probar Crear servicio y cancelar/guardar; nuevo=1 desaparece de la URL.
6. Revisar otro mes, día vacío y disposición móvil.
7. Como técnico, Agenda/Inicio globales deben devolver 403 y sus rutas permanecer protegidas.

No se ejecutaron commit, tag, push, deploy, cambios de versión ni operaciones sobre producción.
