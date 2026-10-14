# Fotos opcionales del servicio

## Esquema y almacenamiento

Nueva migración `0014_create_servicio_fotos.sql`; no se alteraron las anteriores.
Tabla `servicio_fotos`: id, servicio_id (FK ON DELETE CASCADE), r2_key única,
nombre_original, mime, size, orden, created_at, lote e indice_lote.
Índice de servicio/orden/id, CHECK de MIME/tamaño y triggers que impiden más de cinco fotos,
también ante inserciones concurrentes. Lote/índice garantizan reintentos sin duplicaciones.

Se reutiliza el bucket privado mediante el binding `COMPROBANTES`, sin renombrarlo ni modificar Wrangler.
Keys generadas exclusivamente en backend: `servicios/{id}/fotos/{uuid}.jpg|png|webp`.
El comprobante conserva su prefijo, referencia en Servicios, reglas y permisos independientes.
No hay URLs públicas, imágenes en D1, base64, cambios de versión ni recursos remotos nuevos.

## API y permisos

- `GET /api/servicios/:id/fotos`: metadata pública ordenada.
- `POST /api/servicios/:id/fotos`: multipart con `archivos` repetido (0–5 nuevas fotos),
  `eliminar` opcional como array JSON de IDs y cabecera `Idempotency-Key` para reintentar el mismo lote.
  Debe incluir al menos una foto nueva o una eliminación. Un mismo identificador no admite otra selección.
- `GET /api/servicios/:id/fotos/:fotoId`: descarga privada.
- `DELETE /api/servicios/:id/fotos/:fotoId`: retiro individual del servicio.

Coordinador administra y consulta. Técnico asignado solo lista/ve; POST/DELETE siempre 403.
Técnico ajeno recibe 403. Sin sesión: 401. Foto de otro servicio: 404 en descarga/borrado individual.
La API nunca acepta keys proporcionadas por el cliente y no devuelve r2_key, lote ni datos de comprobante.
Metadata: id, nombre_original, mime, size, orden, created_at.
Descarga: MIME correcto, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`.

## Guardado y fallos

Estrategia B: el formulario guarda el servicio y a continuación sus fotos sin cerrarse,
con un único botón Guardar servicio/Guardar cambios y estado Guardando durante todo el flujo.
Permanece bloqueado frente a doble envío, incluida la confirmación de sobrecarga existente.
Sin fotos no se realiza ninguna subida.

Si el servicio se guardó y las fotos fallaron, el mensaje identifica el servicio creado/actualizado.
Los datos del servicio quedan bloqueados y Guardar reintenta únicamente las fotos,
con el mismo ID y lote. Cerrar servicio guardado conserva el servicio y muestra un aviso
en Servicios para revisar las fotos cuyo guardado no pudo confirmarse.
No se borra automáticamente el servicio: podría haber sido consultado/actualizado por otro usuario.
No existe DELETE público de Servicios.

Las eliminaciones de edición son marcas locales reversibles: Cancelar no las aplica.
Guardar fotos valida todos los archivos, prepara R2 y aplica retiradas/altas en una transacción D1.
Si falla una escritura, D1 revierte la transacción; se retiran los objetos nuevos sin referencias.
Ante un commit con respuesta perdida, se comprueban las referencias antes de limpiar R2.
Las fotos existentes retiradas se borran de R2 después de quitar su referencia D1.
Si R2 no permite limpiar, se comunica un aviso de limpieza pendiente; no queda una referencia rota.
Un fallo simultáneo que impida comprobar D1 conserva los objetos y pide reintentar.
No se afirma atomicidad entre el servicio y sus fotos ni entre D1 y R2.

## Interfaz

Campo al final del formulario, junto a Observaciones, en los cinco tipos.
Opcional, selección múltiple/acumulativa y máximo cinco entre existentes no retiradas y nuevas.
JPEG/PNG/WebP, archivo no vacío, hasta 5 MB por foto; backend además comprueba la firma del contenido.
Previews con X táctil; restaurar una existente tampoco puede superar cinco.
URLs temporales revocadas al quitar, cancelar, finalizar guardado y desmontar.
El detalle tiene miniaturas privadas para coordinador/técnico asignado y visor con descarga autenticada.
El visor libera su URL al cerrar y devuelve el foco. Móvil: dos/tres columnas, botones de 44px.
Las fotos permanecen al cambiar de tipo.

## Archivos de esta etapa

Creados:

- backend/migrations/0014_create_servicio_fotos.sql
- backend/src/routes/servicioFotos.ts
- backend/src/services/fotosArchivo.ts
- backend/src/services/fotosConsulta.ts
- backend/src/services/fotosGuardado.ts
- backend/test/fotosAyudas.ts
- backend/test/servicioFotos.spec.ts
- backend/test/fotosSeguridad.spec.ts
- frontend/src/services/servicioFotosService.ts
- frontend/src/components/servicios/fotos/borradorFotos.ts
- frontend/src/components/servicios/fotos/useFotosEdicion.ts
- frontend/src/components/servicios/fotos/EditorFotos.tsx
- frontend/src/components/servicios/fotos/FotoMiniatura.tsx
- frontend/src/components/servicios/fotos/FotosServicio.tsx
- frontend/src/components/servicios/fotos/VisorFoto.tsx
- frontend/src/styles/servicioFotos.css
- frontend/test/fotosAyudas.cjs
- frontend/test/fotosEditor.test.cjs
- frontend/test/fotosGuardado.test.cjs
- frontend/test/fotosVisor.test.cjs
- docs/fotos-servicio.md

Modificados:

- backend/src/index.ts: endpoints.
- frontend/src/components/servicios/FormularioServicio.tsx: fotos y recuperación de guardado parcial.
- frontend/src/components/servicios/operacionServicio.ts: completar el guardado antes de cerrar/desbloquear.
- frontend/src/components/servicios/DetalleServicio.tsx: galería de solo lectura para ambos roles.
- frontend/src/pages/ServiciosPage.tsx: avisos de guardado/limpieza.

Finanzas, Excel, Agenda/Inicio y la implementación del comprobante permanecieron intactos.
No cambiaron dependencias, bindings, compatibility_date ni versiones.

## Prueba local exacta

La migración se prueba automáticamente en D1 aislado de Vitest. No se aplicó a bases persistentes.
Para usar la base local por defecto, desde `backend`:

```powershell
npx.cmd wrangler d1 migrations apply serviceos-db --local
npm.cmd run dev -- --local --port 8787
```

Si la sesión de desarrollo utiliza `.wrangler/local-servicios-corregido`, ambos comandos
deben señalar esa misma persistencia para conservar sus datos de prueba:

```powershell
npx.cmd wrangler d1 migrations apply serviceos-db --local --persist-to .wrangler/local-servicios-corregido
npm.cmd run dev -- --local --persist-to .wrangler/local-servicios-corregido --port 8787
```

Elegir solo la variante correspondiente a la base que ya utilizas. En otra terminal, desde `frontend`:

```powershell
npm.cmd run dev
```

Abrir la URL local que imprima Vite; /api apunta a 127.0.0.1:8787.

1. Coordinador: Nuevo servicio, llenar campos y guardar sin fotos.
2. Repetir con una y cinco fotos reales en JPEG/PNG/WebP; probar selección acumulativa,
   retirar una miniatura antes de guardar e intentar la sexta.
3. Probar los cinco tipos: fotos disponibles sin afectar comprobante.
4. Editar un servicio con fotos: quitar existentes/agregar nuevas y Cancelar; verificar que no cambió nada.
5. Repetir y Guardar cambios: verificar retiros/altas, orden y máximo cinco.
6. Técnico asignado: abrir servicio, miniaturas y visor; no aparecen controles de fotos ni comprobante.
7. Probar desde otro técnico: endpoints de ese servicio responden 403.
8. Simular fallo de subida: confirmar mensaje de servicio guardado y reintento sin duplicar el servicio.
9. Revisar móvil, cancelar formularios y abrir/cerrar visor.

Pendiente: prueba visual manual del nuevo bloque en PC/móvil y aplicación de 0014 a la base local elegida.
No se aplicaron migraciones remotas ni se crearon recursos Cloudflare remotos.
No se ejecutaron commit, tag, push ni deploy.
