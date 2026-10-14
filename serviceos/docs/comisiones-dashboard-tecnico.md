# Comisiones y dashboard técnico

Etapa implementada sin cambiar versiones, publicar ni operar recursos remotos.
Los cambios locales anteriores se conservaron; el estado Git contiene también esa etapa previa.

## Comportamiento

- Migración nueva `0013_add_servicio_trabajo_realizado.sql`: columna nullable. 0011 y 0012 permanecen intactas.
- La creación no exige trabajo realizado. El coordinador lo edita en formulario/detalle.
- El técnico asignado guarda concepto o cambia estado desde el detalle mediante `PATCH /api/servicios/:id/estado`.
  Ese endpoint admite únicamente `estado` y `trabajo_realizado`; comprueba propiedad también al escribir.
- Los servicios presenciales/remotos no pasan a realizado sin concepto; instalaciones y garantías no lo requieren.
- El concepto se normaliza a mayúsculas, sin acentos, con espacios compactados y sin sufijos de modalidad repetidos.
- Los registros históricos siguen siendo legibles con NULL y conservan la edición administrativa.
  Al exportarlos se muestra `TRABAJO NO REGISTRADO PRESENCIAL/REMOTA`, para no confundir máquina y trabajo.
  El coordinador puede completar su concepto histórico.
- `GET /api/servicios/comisiones.xlsx?mes=YYYY-MM`: identidad técnica de sesión; coordinador exporta todo el equipo.
  Solo incluye realizados del mes de los cuatro tipos con comisión; garantías siempre excluidas.
  Los filtros visuales no afectan la exportación. Un técnico no puede enviar `tecnico_id` para exportar otro.
- ExcelJS 4.4.0, variante de navegador, genera y lee XLSX dentro del runtime Workers sin flags Node,
  cambios de compatibility_date ni actualizaciones de Wrangler.
- Encabezado corporativo morado, datos de empresa centralizados, títulos centrados, ocho columnas oficiales,
  bordes, formato monetario, teléfonos como texto y totales SUM con resultados calculados.
  Una hoja por técnico con datos; nombres sanitizados, hasta 31 caracteres y sin colisiones.
- `GET /api/servicios/resumen-pagos?mes=YYYY-MM`: solo coordinador; suma el cálculo central `pagoTecnico`
  para todas las asignaciones del mes, independientemente del estado y filtros. Garantías aportan cero.
- Servicios permite descargar Blob con nombre de Content-Disposition, bloqueo inmediato de doble envío,
  errores visibles y liberación de object URL.
- `/tecnico`: dashboard mobile-first con pendientes, en proceso, realizados del mes y servicios de hoy.
  Consulta solamente los servicios de la sesión. Próximo trabajo sin realizar desde hoy y máximo tres próximos,
  orden fecha/id. Enlaces con mes e ID abren exactamente el servicio.
- Accesos Servicios y Taller; `/taller` reutiliza el acceso existente de `/maquinas`.
  Las pantallas secundarias conservan Atrás hacia `/tecnico`. Coordinador en `/tecnico` redirige a su inicio.

## Archivos creados en esta etapa

Backend:

- `backend/migrations/0013_add_servicio_trabajo_realizado.sql`
- `backend/src/config/empresa.ts`
- `backend/src/types/exceljs-browser.d.ts`
- `backend/src/services/servicioTrabajo.ts`
- `backend/src/services/comisionesConsulta.ts`
- `backend/src/services/comisionesWorkbook.ts`
- `backend/src/routes/comisiones.ts`
- `backend/test/servicioTrabajo.spec.ts`
- `backend/test/comisiones.spec.ts`
- `backend/test/resumenPagos.spec.ts`

Frontend:

- `frontend/src/services/comisionesService.ts`
- `frontend/src/components/servicios/ComisionesMes.tsx`
- `frontend/src/components/servicios/TrabajoRealizado.tsx`
- `frontend/src/components/tecnico/resumenTecnico.ts`
- `frontend/src/components/tecnico/DashboardTecnico.tsx`
- `frontend/src/styles/comisiones.css`
- `frontend/test/hooksPrueba.cjs`
- `frontend/test/comisiones.test.cjs`
- `frontend/test/dashboardTecnico.test.cjs`
- `frontend/test/trabajoRealizado.test.cjs`
- Esta guía: `docs/comisiones-dashboard-tecnico.md`

## Archivos modificados en esta etapa

- `backend/package.json`, `backend/package-lock.json`
- `backend/src/index.ts`
- `backend/src/routes/servicios.ts`
- `backend/src/services/serviciosService.ts`, `backend/src/services/serviciosValidacion.ts`
- `backend/test/tsconfig.json`
- `backend/test/servicios.spec.ts`, `backend/test/serviciosAgenda.spec.ts`, `backend/test/comprobante.spec.ts`
- `frontend/src/services/serviciosService.ts`
- `frontend/src/components/servicios/DetalleServicio.tsx`
- `frontend/src/components/servicios/FormularioServicio.tsx`
- `frontend/src/components/servicios/formularioServicioAyudas.ts`
- `frontend/src/pages/ServiciosPage.tsx`, `frontend/src/pages/TecnicoInicioPage.tsx`
- `frontend/src/routes/AppRoutes.tsx`
- `frontend/src/styles/tecnicoInicio.css`

## Validación

Backend: suite Vitest sobre Workers/D1 aislados, lectura de celdas reales de XLSX,
hojas, fórmulas/resultados, estilos, privacidad, filtros, trabajo realizado y resumen.
Incluye generación/lectura de 600 filas sin Web Workers y período de febrero bisiesto.

Frontend: pruebas Node de componentes reales, handlers y efectos; permisos, conceptos,
dashboard, KPIs, enlaces, resumen, descarga por mes, errores, doble envío y revocación.
No sustituyen una inspección visual en Excel o en dispositivos reales.

Comandos requeridos:

```powershell
cd backend
npm.cmd test -- --run
npx.cmd tsc --noEmit
npx.cmd tsc --noEmit -p test/tsconfig.json
cd ../frontend
npm.cmd run lint
npm.cmd run build
npm.cmd run check:lines
node --test test/*.test.cjs
cd ..
git diff --check
git status --short
git diff --stat
```

## Prueba local

1. Desde `backend`, aplicar exclusivamente a D1 local:
   `npx.cmd wrangler d1 migrations apply serviceos-db --local`.
   Esta etapa no aplicó migraciones a la base de desarrollo persistente ni a producción;
   los tests aplican las migraciones en sus bases aisladas.
2. Iniciar backend con `npm.cmd run dev -- --local`.
3. En otra terminal, desde `frontend`, ejecutar `npm.cmd run dev`.
   Vite ya dirige `/api` a `http://127.0.0.1:8787`.
4. Con coordinador, crear operaciones del mes para dos técnicos; dejar una pendiente,
   otra en proceso y completar servicios indicando concepto; completar también instalaciones y garantía.
5. Verificar la tarjeta de pagos con filtros distintos: su importe permanece igual.
   Descargar comisiones: un XLSX con hojas por técnico, únicamente realizados con comisión.
6. Con técnico, revisar `/tecnico`, abrir próximo servicio, guardar trabajo y completar.
   Descargar desde Servicios: solo operaciones propias del mes. Revisar también el acceso Taller y Atrás.

## Pendientes y límites

- `npm audit` reporta dos alertas moderadas (ExcelJS y su dependencia uuid) por
  [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
  El aviso describe v3/v5/v6 con buffer proporcionado; esta integración usa workbook XLSX,
  no esas funciones. No se aplicó `audit fix --force` ni se modificaron paquetes ajenos a la etapa.
- Validación visual manual del formato corporativo en Excel y del dashboard en móvil/PC.
- No se ejecutaron commit, tag, push, deploy, migraciones remotas ni creación de recursos remotos.
