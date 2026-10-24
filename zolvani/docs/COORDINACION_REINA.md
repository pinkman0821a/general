# Prueba controlada de coordinación de la Reina

La coordinación con OmniRoute no se ejecutó desde la sesión de desarrollo. Sigue este procedimiento después de reiniciar Zolvani para validar una sola colonia real.

## Preparación

1. Inicia OmniRoute como ya lo tienes configurado y verifica que escuche únicamente en `127.0.0.1` o `::1` en el puerto `20128`.
2. En una consola PowerShell desde `Z:\Zolvani`, habilita el adaptador local y arranca el backend:

   ```powershell
   Set-Location Z:\Zolvani
   $env:ZOLVANI_ENABLE_OMNIROUTE = '1'
   $env:OMNIROUTE_BASE_URL = 'http://127.0.0.1:20128/v1'
   node server\index.mjs
   ```

   Si la instalación exige clave local, conserva el método seguro en memoria que ya utilizas; no pegues ni guardes claves en la tarea, notas o repositorio.
3. Abre `http://127.0.0.1:4173`.
4. En el panel, pulsa **Actualizar conexión** y confirma que OmniRoute aparece conectado. Selecciona Gemini únicamente si el modelo figura como gratuito y fue autorizado para uso actual en la configuración del propietario. El adaptador comprueba de nuevo que el modelo siga elegible al ejecutar.

## Ejecutar una vez

En **Huevos → Encargar un objetivo a la Reina**, envía:

> Analiza una categoría de productos para comercio electrónico en Colombia. Identifica sus oportunidades y riesgos. Determina qué datos de costos y ventas necesitamos para calcular rentabilidad. Revisa la consistencia del análisis y entrégame un informe conjunto.

Pulsa **Iniciar objetivo con IA real** una sola vez. El motor hará como máximo cuatro solicitudes: planificación de Reina, análisis de Exploradora, análisis de Financiera y revisión de Inspectora. Concurrencia es uno; no se activa otro objetivo mientras este siga abierto. Aunque el proveedor marque el modelo gratuito, estas llamadas consumen su cuota gratuita vigente.

## Resultado esperado y límites

- Reina deja un huevo de planificación y un plan local validado con tres etapas; el programa fija agentes y dependencias.
- Exploradora entrega primero. Financiera recibe su resumen/evidencias; Inspectora recibe las dos entregas anteriores.
- Cada huevo y transición se guarda en `data/state.json`. El panel muestra modelo/estado, salidas, consumo de tokens reportado, dependencias, historial e informe consolidado.
- Sin búsqueda web o fuente conectada, el resultado solo puede contener hipótesis. La Financiera debe indicar que costos, ventas y margen están pendientes; no se muestran precios, disponibilidad, proveedores ni rentabilidad como verificados.
- Si hay error, cuota agotada, cancelación o salida no válida, Reina detiene las etapas pendientes. No se reintenta ni relanza automáticamente. Conserva el objetivo y diagnóstico; revisa antes de cualquier nueva solicitud.
- No se ejecutan pedidos Dropi, pagos, mensajes, compras ni publicaciones.

## Diagnóstico

El plan y los tres resultados deben tener `simulated: false`, proveedor esperado y validación estructural aprobada. El informe final también se marca real; eso confirma que las respuestas vinieron del proveedor configurado y pasaron el contrato local, **no** valida comercialmente las hipótesis. La validación externa de proveedores, referencias, disponibilidad y costos continúa pendiente.
