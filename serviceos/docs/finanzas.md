# Finanzas del coordinador

## Alcance y endpoints

La ruta existente `/finanzas` muestra comisiones generadas desde la asignación del servicio,
independientemente de su estado. No registra pagos efectuados ni liquidaciones.
Conserva la protección existente de AuthGate y CoordinadorGate: técnico por URL vuelve a `/tecnico`.

Endpoints GET, sesión obligatoria y rol coordinador:

- `/api/finanzas/resumen?mes=YYYY-MM`: KPIs globales, técnicos agregados,
  seis meses de histórico, `historico_tecnicos` con rankings independientes (mes seleccionado primero)
  y comparación con mes anterior en una sola respuesta.
- `/api/finanzas/tecnicos/:id?mes=YYYY-MM`: técnico, servicios con pago del mes y total.
  Proyección explícita: fecha, cliente, tipo, estado, valor del servicio, pago e ID para enlazar Servicios.

Técnico recibe 403, incluso si modifica ID o filtros. Sin sesión: 401.
Mes estricto, incluyendo rechazo de duplicados, formato incompleto, año cero y meses inexistentes.
Detalle exige ID entero positivo y usuario con rol técnico; inexistente/coordinador devuelve 404.
Respuestas con `Cache-Control: no-store`. No hay escrituras financieras ni cambios de esquema.

## Fuente y cálculo

Desde RC.3 el KPI superior muestra **Ingresos por servicios**, usando `resumen.ingresos_servicios`:
valor completo de servicio presencial y remoto del mes seleccionado según `fecha_programada`, en todos los estados.
Excluye garantías, ambas instalaciones y comisiones. Ejemplo: presencial 500000 + remoto 300000,
con instalación y garantía adicionales, produce 800000 COP. Incluye valores cuyo pago redondea a cero.

Los pagos a técnicos se calculan con `pagoTecnico`, la función central existente, sin cambios:

- Garantía: cero.
- Instalación presencial: 100000 COP.
- Instalación remota: 50000 COP.
- Servicio presencial/remoto: `Math.round(valor_servicio * 0.40)`.

La pantalla recibe datos agregados del backend, nunca el conjunto de servicios para calcular KPIs.
D1 consulta solo campos necesarios de los seis meses y TypeScript agrega con esa función central.
No se replican fórmulas financieras en SQL ni frontend.

`consultarPagoMes`, usado por `/api/servicios/resumen-pagos`, ahora delega en
`consultarResumenFinanzasMes`. Finanzas y Servicios comparten consulta y `agregarFinanzas`.
La prueba de integración compara sus importes para el mismo mes.

Servicios con pago y técnicos con actividad cuentan únicamente operaciones cuyo pago calculado es > 0.
Además de garantías, un servicio de valor mínimo cuyo redondeo sea cero tampoco cuenta.
El promedio es total / servicios con pago; si no hay operaciones, cero.
La API conserva el promedio numérico; la UI muestra COP sin decimales.

El detalle contiene esas mismas operaciones con pago > 0, orden fecha ASC e ID ASC.
Cada ranking mensual ordena total DESC, nombre ASC y finalmente ID para estabilidad.
Técnicos inactivos con actividad aparecen con su estado de cuenta y conservan el historial.

Reasignar un servicio mueve su contribución a su técnico actual en la siguiente consulta.
También sucede en meses históricos. El total global no cambia por una reasignación.
No hay snapshots ni movimientos; la fuente es la fila actual de Servicios.

La comparación devuelve diferencia absoluta y porcentaje respecto al mes anterior.
Si el anterior es cero, porcentaje es null: la UI muestra texto en vez de NaN/Infinity.
El histórico siempre incluye mes seleccionado y cinco anteriores, con ceros para meses sin datos.

## Pantalla

Selector anterior/siguiente y entrada mensual. Cuatro KPIs compactos y comparación del mes principal.
Seis rankings con barras horizontales, escala propia de cada mes, montos visibles y accesibles.
Sin listado anterior ni librería de gráficos nueva. Meses sin actividad muestran un mensaje explícito.
Seleccionar una fila abre el detalle de ese técnico y ese mes histórico.
Detalle lateral en escritorio y apilado en móvil, foco al abrir y enlaces al servicio exacto.
La página maneja carga, errores y reintento; aborta consultas anteriores al cambiar mes/desmontar,
oculta datos obsoletos y cierra el detalle al cambiar mes.
En celular: dos columnas KPI, gráfico flexible y ninguna tabla que necesite desplazamiento horizontal.

### Resumen privado del técnico

`GET /api/tecnico/resumen-financiero` exige sesión técnica y devuelve exclusivamente
`mes`, `pago_generado` y `servicios_con_pago`. No admite parámetros: identidad de sesión,
mes actual en America/Bogota. No expone totales globales ni rankings.
Comparte consulta y `agregarFinanzas` con Finanzas/Servicios; todos los estados aportan.
El dashboard coloca este bloque junto al saludo en PC y antes de los KPIs en móvil.

### Diagnóstico del monto imposible

Lectura exclusivamente local de `.wrangler/local-servicios-corregido`: el servicio #3,
remoto de Andres en octubre de 2026, almacena `valor_servicio = 214256756534232`
con tipo SQLite integer. La comisión es 85702702613693. Los otros servicios generan
100000, 493381 y 493827: suma exacta 85702703700901, el importe reportado.
No existe concatenación, SUM divergente ni error del formato COP. Las validaciones actuales
aceptan cualquier entero positivo seguro; ese dato supera los montos de prueba esperados
pero cumple ese contrato. No se alteró el registro ni se inventó un límite comercial.
Se solicitó al usuario el valor correcto y el máximo admisible para cerrar la corrección.
La regresión comprueba 80000 + 100000 + 50000 = 230000 en todas las fuentes financieras,
y otra prueba reproduce exactamente el monto reportado desde sus valores originales.

## Auditoría ExcelJS

Revisión de dependencias instaladas, registro npm y código utilizado, sin modificar versiones.

- Cadena exacta: `exceljs@4.4.0` -> `uuid@8.3.2` (rango declarado `^8.3.0`).
- Las dos alertas moderadas representan el aviso de uuid y su propagación a ExcelJS,
  no dos vulnerabilidades independientes.
- [GHSA-w5hq-g745-h8pq / CVE-2026-41907](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
  afecta métodos `v3()/v5()/v6()` con buffer de salida externo y límites incorrectos.
  El aviso distingue `v4()` como protegido. Versiones reparadas: 11.1.1, 12.0.1, 13.0.1.
- Se inspeccionó `exceljs/lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js` y el bundle browser:
  ExcelJS usa `uuidv4()` sin buffer externo para identificadores de formato condicional extendido.
  El formato ServiceOS no crea esas reglas. ServiceOS no invoca v3/v5/v6 ni admite importar XLSX externos.
- Conclusión para el flujo actual: no se identificó una ruta de explotación del aviso.
  Es una conclusión basada en el código utilizado, no una afirmación de seguridad universal del paquete.
- `npm view exceljs version dependencies.uuid` confirma 4.4.0 como versión publicada actual y el mismo rango uuid.
- `npm audit fix --dry-run --ignore-scripts` no ofrece corrección sin cambios incompatibles;
  propone con force instalar ExcelJS 3.4.0, una degradación incompatible. No se aplicó.
- Un override a uuid 11.1.1 saldría del rango soportado y no repararía el uuid incluido dentro de
  `exceljs/dist/exceljs.min.js`, el bundle utilizado en Workers. No se usó para ocultar la alerta.
- Decisión: conservar ExcelJS y documentar las dos alertas pendientes hasta una actualización oficial
  del paquete/bundle o una sustitución revisada. No se ejecutó `npm audit fix --force`.

Comandos de diagnóstico ejecutados: `npm.cmd audit --json`, `npm.cmd ls exceljs uuid`,
`npm.cmd audit fix --dry-run --ignore-scripts`, `npm.cmd view exceljs version dependencies.uuid`,
`npm.cmd view uuid@11.1.1 engines exports --json`, inspección de imports y llamadas del código real.
No cambiaron package.json ni package-lock.json en esta etapa.

## Archivos de esta etapa

Creados:

- `backend/src/services/finanzasCalculo.ts`
- `backend/src/services/finanzasConsulta.ts`
- `backend/src/routes/finanzas.ts`
- `backend/test/finanzas.spec.ts`
- `frontend/src/services/finanzasService.ts`
- `frontend/src/components/finanzas/finanzasAyudas.ts`
- `frontend/src/components/finanzas/useFinanzas.ts`
- `frontend/src/components/finanzas/MesFinanzas.tsx`
- `frontend/src/components/finanzas/ResumenFinanzas.tsx`
- `frontend/src/components/finanzas/RankingMensual.tsx`
- `frontend/src/components/finanzas/DetalleFinanzasTecnico.tsx`
- `frontend/src/styles/finanzas.css`
- `frontend/test/finanzasAyudas.cjs`
- `frontend/test/finanzasPantalla.test.cjs`
- `frontend/test/finanzasInteraccion.test.cjs`
- `docs/finanzas.md`
- `backend/src/routes/tecnicoResumenFinanciero.ts`
- `backend/test/finanzasRanking.spec.ts`
- `frontend/src/components/tecnico/ComisionPersonal.tsx`
- `frontend/src/services/tecnicoFinanzasService.ts`
- `frontend/test/comisionPersonal.test.cjs`

Modificados:

- `backend/src/index.ts`: registro de endpoints.
- `backend/src/services/comisionesConsulta.ts`: fuente mensual compartida.
- `frontend/src/pages/FinanzasPage.tsx`: reemplazo del placeholder.
- `frontend/src/pages/TecnicoInicioPage.tsx`: resumen privado.
- `frontend/src/components/tecnico/DashboardTecnico.tsx` y `frontend/src/styles/tecnicoInicio.css`: introducción adaptable.

Los cambios de etapas previas se conservaron. No se modificó comprobante, Taller ni el Excel existente.

## Pruebas y prueba manual local

Backend: permisos, mes/ID, cinco tipos, redondeo, todos los estados, promedio,
inactivos, detalle, proyección, orden, reasignación, seis meses y filtros sin alterar total.
Se repite también toda la suite anterior, incluida generación y lectura real de XLSX en Workers.

Frontend: protección de ruta, mes, KPIs, COP, rankings, comparación, selección de mes histórico,
detalle sin comprobantes, vacío, estructura responsive, carga, errores, reintento y aborto de datos antiguos.
Se mantiene la suite anterior de Servicios, dashboard y descarga Excel.

Desde backend: `npm.cmd test -- --run`, `npx.cmd tsc --noEmit`,
`npx.cmd tsc --noEmit -p test/tsconfig.json`.
Desde frontend: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:lines`,
`node --test test/*.test.cjs`.
Raíz: `git diff --check`, `git status --short`, `git diff --stat`.

Prueba local:

1. Iniciar backend con `npm.cmd run dev -- --local` y frontend con `npm.cmd run dev`.
   No hay migraciones nuevas para Finanzas; debe existir el esquema local de la etapa anterior.
2. Entrar como coordinador a `/finanzas`, seleccionar un mes con operaciones y contrastar total con Servicios.
3. Cambiar estado de un servicio: su comisión permanece. Reasignarlo: cambia el desglose, no el total global.
4. Seleccionar un técnico, revisar total y abrir un servicio desde el detalle.
5. Abrir un técnico de un mes histórico: KPIs permanecen en el mes principal. Revisar otro mes y un mes vacío.
6. Revisar móvil y escritorio; confirmar que técnico por URL vuelve a `/tecnico` y la API responde 403.

7. Entrar como técnico y comparar su comisión actual con su ranking/detalle del coordinador.

Pendiente: valor correcto y límite comercial para el registro local anómalo,
inspección visual manual en dispositivos reales y las dos alertas documentadas.
No se ejecutaron commit, tag, push, deploy, cambios de versión ni operaciones sobre producción.
