# Auditoría preproducción — ServiceOS v0.3.0

Auditoría ejecutada: 5 de octubre de 2026. Informe completado: 13 de octubre de 2026.
Workspace: `C:\GitHub\serviceos-codex-safe\serviceos`.

## Recomendación para Cristian

Recomiendo preparar una RC para revisión manual de Cristian en un entorno aislado,
con cuentas y datos de prueba. No recomiendo exponerla públicamente ni utilizar
credenciales reales mientras permanezcan los riesgos de autenticación indicados abajo.
Este informe no declara el sistema listo para producción ni autoriza publicación.
La siguiente etapa es revisión manual y preparación de RC; la decisión de publicación es posterior.

## Alcance y evidencia

Se revisaron autenticación/roles, Inicio, Agenda, Servicios, Técnicos, Oficina,
Finanzas, dashboard técnico, Excel, comprobantes y fotos del servicio.
Se conservaron las reglas de negocio, rutas y versiones configuradas.
No hubo commit, tag, push, deploy, modificaciones de producción ni recursos Cloudflare remotos.
La D1 visual principal y los bindings remotos D1/R2 no se utilizaron en las pruebas.
Las migraciones existentes no se modificaron.

La finalización del informe reutiliza los resultados aprobados antes de la interrupción.
El archivo no existía al retomar. No se volvió a ejecutar la auditoría ni las suites completas.

| Validación ejecutada en la auditoría | Resultado |
| --- | --- |
| Backend `npm.cmd test -- --run` | **774 pruebas aprobadas**, 27 archivos |
| Backend `npx.cmd tsc --noEmit` | Aprobado |
| Backend `npx.cmd tsc --noEmit -p test/tsconfig.json` | Aprobado |
| Frontend `node --test test/*.test.cjs` | **135 pruebas aprobadas** |
| Frontend `npm.cmd run lint` | Aprobado |
| Frontend `npm.cmd run build` | Aprobado: TypeScript y Vite |
| Frontend `npm.cmd run check:lines` | Aprobado: ningún archivo revisado supera 300 líneas |
| D1 aislada: migraciones 0001–0014 | Aplicadas correctamente, orden y nombres comprobados |
| D1 `PRAGMA foreign_key_check` | Aprobado, sin infracciones |
| Matriz adicional de autorización | Aprobada |
| Backend `npm.cmd audit --json` | Dos alertas moderadas conocidas; salida 1 |
| Frontend `npm.cmd audit --json` | Sin alertas; salida 0 |

La suite inicial tenía 757 pruebas backend y 132 frontend. Se agregaron 17 y 3,
respectivamente, y se repitieron las validaciones afectadas tras las correcciones.
Los tests frontend renderizan componentes y ejecutan hooks/handlers; no equivalen a E2E de navegador.
Los resultados de dependencias corresponden al 5 de octubre; no se consultaron nuevamente al completar el informe.

## BLOQUEANTES

### B1. Contraseñas en texto plano: código corregido; transición de cuentas pendiente

`crearPasswordHash` devolvía la contraseña y `verificarPassword` comparaba los textos.
La columna `password_hash` no protegía las credenciales.
Se sustituyó por PBKDF2-SHA256 con salt aleatorio de 16 bytes, 100000 iteraciones
y resultado de 32 bytes. La comparación de hashes recorre el resultado sin salida anticipada.
Crear técnico y cambiar/restablecer clave reutilizan la misma función central.

Las cuentas legacy conservan acceso: después de verificar su contraseña, login actualiza
el almacenamiento mediante UPDATE condicionado al valor anterior y al usuario activo.
No se actualizan cuentas inactivas ni se emite sesión si esa escritura ya no corresponde.
Se probaron ambos roles, salt aleatorio, clave incorrecta, hash corrupto, actualización legacy,
creación, cambios de contraseña, revocación de sesiones y ausencia del hash en respuestas.

**Riesgo pendiente:** una cuenta que no inicia sesión ni restablece su clave conserva
el texto anterior. No se ejecutó una conversión masiva ni se comprobó el estado de cuentas reales.
Antes de utilizar credenciales reales debe completarse y verificarse la transición.
La corrección no revierte una posible exposición previa de contraseñas.

## IMPORTANTES

### I1. Comprobante con respuesta D1 perdida: corregido

Después de subir a R2, D1 podía confirmar UPDATE y perder la respuesta.
El catch limpiaba incondicionalmente el archivo nuevo aunque D1 ya lo referenciara.
Ahora se consulta la referencia antes de borrar: un commit confirmado conserva el nuevo
y permite limpiar el anterior; si también falla la lectura, se conserva el archivo y se
devuelve un error claro sobre el resultado no confirmado.
Dos regresiones reproducen commit con respuesta perdida y fallo de la lectura posterior.
Se mantienen los permisos, tipos admitidos y demás reglas del comprobante.

### I2. Coste del hash y compatibilidad Workers: pendiente antes de exposición pública

Las 100000 iteraciones funcionan en workerd y respetan su límite de PBKDF2.
Quedan por debajo de las 600000 recomendadas por OWASP para PBKDF2-HMAC-SHA256.
Se debe revisar el esquema/coste y el presupuesto del runtime antes de exposición pública.
No se incorporaron dependencias criptográficas ni se cambió compatibility_date.
Fuentes consultadas durante la auditoría:
[Web Crypto de Workers](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/),
[límite del runtime](https://github.com/cloudflare/workerd/issues/1346),
[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### I3. ExcelJS/uuid: dos alertas moderadas conocidas pendientes

Cadena instalada: `exceljs@4.4.0 → uuid@8.3.2`. Las dos alertas representan un aviso
en uuid y su propagación a ExcelJS, no dos vulnerabilidades independientes.
El [aviso GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
afecta v3/v5/v6 con buffers externos y límites incorrectos; v4 comprueba esos límites.
El código ExcelJS inspeccionado utiliza uuidv4. ServiceOS genera XLSX con su bundle browser,
sin importar workbooks del usuario ni crear las reglas condicionales extendidas que utilizan uuid.
Inferencia del código revisado: no se identificó una vía de explotación en el flujo actual.
Esto no elimina la alerta ni garantiza seguridad universal de la dependencia.

`npm audit fix --dry-run --ignore-scripts --json` no ofreció una solución compatible:
propuso ExcelJS 3.4.0 como cambio mayor. No se aplicaron cambios, overrides ni `--force`.
Un override tampoco actualizaría el uuid incrustado en el bundle utilizado por Workers.
No aparecieron alertas nuevas en la ejecución registrada. Frontend tuvo cero alertas.

### I4. Limpieza R2 fallida: riesgo operativo existente

Las pruebas de eliminación/reemplazo conservan referencias válidas y comunican limpieza pendiente.
Si R2 falla al borrar, pueden permanecer objetos privados huérfanos.
Si D1 no permite confirmar una escritura, se conserva el archivo para evitar una referencia rota.
No existe reconciliación automática; no se agregó una función de limpieza en esta auditoría.

## MENORES

### M1. Botón de notificaciones decorativo: corregido

La barra global mostraba botón y punto de notificaciones sin acción implementada.
Se retiró ese control y se agregó regresión. No se implementaron notificaciones.

### M2. Restos de plantilla sin acceso operativo: conservados

`ClientesPage.tsx` contiene un placeholder, pero no está conectado a rutas ni menú.
Existen assets React/Vite y estilos antiguos sin uso evidente. No se hizo limpieza cosmética.
No se encontraron mocks visibles en Inicio/Agenda ni un enlace operativo a Clientes.

### M3. Payload inválido de login: corregido

Un user no textual podía fallar al ejecutar trim y producir 500; password no textual
no se validaba explícitamente. Esos campos inválidos ahora se rechazan con 400 y regresión.

## INFORMATIVOS

Versiones configuradas para este checkpoint: 0.3.0-rc.1.
Oficina conserva internamente Taller, `/taller`, `/api/taller` y el acceso `/maquinas`.
No se hallaron console.log, TODO, FIXME, debugger, credenciales constantes ni URLs localhost
en el código operativo inspeccionado. Los ejemplos en placeholders de inputs son ayudas de captura.
No se introdujo un límite comercial para valor_servicio ni se cambiaron fórmulas financieras.
Se conservó la validación de COP numéricos positivos, finitos y enteros representables con seguridad.

## Cobertura funcional preservada

| Área | Evidencia y comportamiento |
| --- | --- |
| Autenticación | Login de ambos roles, logout, usuario inactivo, sesión inválida/expirada/desactivada; cookie HttpOnly/SameSite y Secure bajo HTTPS; token de sesión almacenado con hash |
| Servicios | Cinco tipos, tres estados y campos condicionales; técnico solo estado/concepto propio; realizado exige trabajo_realizado en servicios presencial/remoto |
| Asignación | Técnico activo; bloqueo manual duro; 409 de sobrecarga confirmable sin omitir indisponibilidad; remoto no ocupa |
| Agenda/Inicio | Fuente compartida: manual > sobrecarga > un presencial > disponible; remotos secundarios, inactivos con histórico y enlaces exactos; sin horas ficticias |
| Técnicos | Skills y disponibilidad reales, administración coordinador, calendario individual y detalle de servicios |
| Oficina | Recepción, edición, accesorios, catálogo, entrega/historial y restricciones D1; sin DELETE de recepción |
| Comprobante | Solo servicios presencial/remoto y coordinador; cambio de tipo conserva evidencia oculta; firma/MIME/5 MB; key excluida |
| Fotos | Cinco tipos, 0–5 fotos, 5 MB, MIME/firma, técnico propio solo lectura; cancelación conserva existentes; previews/visor revocan object URLs |
| Excel | Generación y lectura de workbook real en Workers; ocho columnas oficiales, NIT 901931175-3, teléfono texto, totales SUM, orden y hojas por técnico; solo realizados sin garantía |
| Finanzas | pagoTecnico central y todos los estados; seis rankings dinámicos DESC/nombre; reasignación, inactivos, detalle y resumen personal; total coincide con Servicios |
| Dashboard técnico | Solo datos propios, comisión personal, KPIs, próximo y hasta tres trabajos, Servicios/Oficina, identidad y salida |

La regresión financiera confirma 80000 + 100000 + 50000 = 230000.
El importe imposible anterior provino de un valor_servicio grande almacenado, según el
diagnóstico previo de `finanzas.md`. No se modificó ese dato durante la auditoría.

## Matriz de seguridad

401 significa sesión ausente/inválida; 403 significa rol o propiedad no permitidos.

| Recurso / acción | Coordinador | Técnico asignado | Técnico ajeno | Sin sesión |
| --- | --- | --- | --- | --- |
| Servicio detalle | Sí | Sí | 403 | 401 |
| Servicio crear/editar administración | Sí | 403 | 403 | 401 |
| Estado/trabajo_realizado | Sí | Sí, campos limitados | 403 | 401 |
| Comprobante GET/PUT/DELETE | Sí, tipos admitidos | 403 | 403 | 401 |
| Fotos listar/ver | Sí | Sí | 403 | 401 |
| Fotos agregar/eliminar | Sí | 403 | 403 | 401 |
| Agenda global/Inicio/Finanzas/resumen pagos | Sí | 403 | 403 | 401 |
| Usuarios/Técnicos/Skills/disponibilidad administrativa | Sí | 403 | 403 | 401 |
| Oficina consulta/entrega | Sí | Compartido | Compartido | 401 |
| Oficina creación/edición/catálogo | Sí | 403 | 403 | 401 |
| Excel | Todos, hojas separadas | Solo propios | Solo sus propios | 401 |
| Resumen financiero personal | 403 | Solo sesión propia | Solo sesión propia | 401 |

Oficina no tiene asignación de técnico en la recepción: consulta/entrega compartidas son la regla existente.
Las pruebas nuevas cubren matriz global, escrituras administrativas, servicios privados y sesiones;
las suites específicas cubren las operaciones completas de comprobante/fotos/Excel.
Las respuestas de datos inspeccionadas no exponen r2_key, comprobante_key, password_hash ni token_hash.
El token de sesión se entrega en la cookie. AuthGate/CoordinadorGate protegen las rutas administrativas;
la creación general de servicios no se ofrece al técnico y POST/PATCH administrativos devuelven 403.

## D1 y R2 aislados

`readD1Migrations` y `applyD1Migrations` aplicaron 0001–0014 en bindings aislados de Vitest/Cloudflare.
Se comprobaron los 14 nombres y su orden, foreign_key_check sin infracciones e índices/triggers esperados.
Las suites D1 ejercitan FK, CHECK, fechas, accesorios, defaults, unicidad y límite de cinco fotos,
incluyendo concurrencia y triggers INSERT/UPDATE. No se modificó ninguna migración.
`PRAGMA integrity_check` fue rechazado por D1 como no autorizado; no se declara aprobado.
La revisión de integridad se apoya en FK y las restricciones soportadas ejercitadas por los tests.

R2 se probó con Miniflare, sin acceder al bucket remoto. Se conserva el binding COMPROBANTES,
con prefijos separados `servicios/:id/comprobantes/` y `servicios/:id/fotos/` y keys UUID del backend.
No hay URLs públicas ni imágenes en D1. Descargas autenticadas con no-store/nosniff y MIME correcto.
Se simularon fallos de upload/delete/D1, concurrencia y commits con respuesta perdida.
La configuración y permisos del bucket remoto no se comprobaron por estar fuera de alcance.

## Fechas, navegación y responsive

Las fechas operativas YYYY-MM-DD usan componentes locales o separación de texto,
sin interpretarlas como medianoche UTC para mostrarlas. Backend usa America/Bogota para hoy/mes financiero.
Excel escribe dd/mm/yyyy como texto. Se conservan pruebas de zonas UTC positivas y negativas.
Agenda/dashboard/detalle enlazan mes y servicio exacto; nuevo=1 abre el formulario solo al coordinador.
Servicios y Oficina técnicos conservan Atrás con destino fijo /tecnico.

Se revisó CSS y estructura para 375px, 768px y desktop: grids flexibles, Agenda compacta,
detalle vertical, KPIs de dos columnas, fotos de dos/tres columnas y formularios apilados.
**Limitación:** no hubo inspección visual de esta auditoría en navegador/dispositivos reales.
No se afirma ausencia de scroll horizontal efectivo ni validación visual completa.
Quedan para revisión manual overflow, foco/teclado, selector de archivos, visor y descarga XLSX móvil.

## Archivos de la auditoría y cierre Git

Modificados: `backend/src/services/passwordService.ts`, `backend/src/routes/auth.ts`,
`backend/src/services/comprobanteService.ts`, `backend/test/comprobanteSeguridad.spec.ts`,
`frontend/src/components/GlobalTopbar.tsx`.

Creados: `backend/test/passwordRegresion.spec.ts`, `backend/test/preproduccionSeguridad.spec.ts`,
`frontend/test/preproduccionNavegacion.test.cjs`, `docs/preproduccion-v0.3.0.md`.
Al retomar se completó únicamente este informe. El estado global incluye trabajo previo sin commit;
`git diff --stat` no incluye el contenido de archivos sin seguimiento, incluido este informe.
`git diff --check` terminó con salida 0, sin errores; Git avisó conversiones LF/CRLF.
`git status --short` se revisó: cambios anteriores y archivos sin seguimiento conservados.
`git diff --stat` se revisó: 30 archivos con seguimiento, 1453 inserciones y 512 eliminaciones.
Estas cifras son del trabajo acumulado; no representan cambios nuevos de código al retomar.

## Siguiente revisión manual

1. Entorno aislado y cuentas de prueba para Cristian; login/logout de ambos roles y cambio de clave.
2. Verificar actualización de cuentas legacy utilizadas y revocación de sesiones al cambiar contraseña.
3. Recorrer los cinco tipos, estados/concepto, bloqueo manual y sobrecarga confirmada de Servicios.
4. Contrastar Agenda/Inicio y abrir servicios exactos; revisar Técnicos/skills/disponibilidad.
5. Completar recepción, edición y entrega de Oficina con accesorios históricos y ambos roles.
6. Probar comprobante separado de fotos, cancelar edición y reintentar fallos de subida.
7. Comparar Excel, Finanzas, Servicios y resumen personal según sus distintas reglas de inclusión.
8. Recorrer las pantallas a 375px, 768px y desktop antes de decidir publicación.

Pendientes principales: transición legacy, revisión del coste del hash, alertas ExcelJS/uuid,
limpieza R2 tras fallos y revisión visual manual. No se realizaron operaciones remotas.
