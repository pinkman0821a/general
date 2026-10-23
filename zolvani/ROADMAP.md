# Hoja de ruta de Zolvani

## v0.1.0-preview.1 — Base local ✅

- [x] Motor local y dashboard.
- [x] Reina + seis roles de abeja.
- [x] Huevos, inspección de resultados simulados, estados y auditoría.
- [x] Vista 3D ligera y datos persistentes.
- [x] Celdillas DEMO y presupuesto COP.
- [x] Tests e historial Git.

## v0.1.0 — Ejecución real controlada ⏳

- [x] Verificar versión local de Codex CLI (`0.162.1`) sin iniciar ejecuciones.
- [x] Preparar adaptador aislado `codex exec`, JSON con esquema y ejecutor simulado.
- [x] Conectar adaptador a la cola existente detrás de configuración explícita y conservar simulación como predeterminada.
- [x] Añadir botón de prueba IA fija y formulario de tareas IA propias, historial persistente, validación estructural y concurrencia 1.
- [x] Preparar pausa/reanudación, cancelación, idempotencia y recuperación sin reintento de tareas Codex interrumpidas.
- [x] Conectar estado del proveedor y resultados separados demo/IA real a la interfaz.
- [x] Transformar renderer Canvas de abejas a hormigas sin cambiar IDs de datos.
- [ ] Ejecutar y registrar una tarea interna real usando Codex sin permisos comerciales.
- [x] Límites locales de tiempo, salida y concurrencia; no hay consumo monetario estimado.
- [ ] Confirmar manualmente una ejecución IA real con el propietario presente.
- [ ] Analizar e integrar incrementalmente componentes útiles de Agentes_IA_3D (React/Three.js, si mejora la experiencia).
- [ ] Prueba en Windows real sobre la partición Z:.

> OmniRoute y Codex tienen interfaz de proveedor separada y el flujo de OmniRoute está integrado y probado con HTTP simulado. No se ha usado autenticación ni cuota real; falta confirmar la instalación local y ejecutar una tarea real con un modelo gratuito verificado.

## v0.1.0-preview.2 — OmniRoute local ⏳

- [x] Cliente local para `/v1/models` y `/v1/chat/completions`, con rechazo de URLs externas.
- [x] Permitir solo modelos etiquetados como gratis por OmniRoute o IDs revisados explícitamente por el propietario.
- [x] Selector y diagnóstico del proveedor/modelo en el panel; historial conserva modelo y uso reportado.
- [x] Una ruta de respaldo gratuita como máximo, solo ante cuota explícita.
- [x] Pruebas HTTP completas sin llamadas a modelos remotos.
- [ ] Verificar el inicio de OmniRoute local y el bind loopback de `20128`.
- [ ] Confirmar proveedor y modelo gratuitos conectados, sus términos y sus límites.
- [ ] Ejecutar una sola tarea real con aprobación consciente del consumo de cuota.

## v0.2.0 — Investigación comercial ⏳

- [ ] Integración autorizada de Dropi después de verificar documentación y términos.
- [ ] Código de producto, precios, costos, stock y fecha de comprobación con evidencias.
- [ ] Margen real estimado, gastos variables, devoluciones y contingencias.
- [ ] Doble comprobación por Inspectora, reglas para datos caducados.

## v0.3.0 — Canales y pedidos ⏳

- [ ] Definir acceso autorizado a WhatsApp Business y Meta/TikTok.
- [ ] Preparar contenido, políticas y reglas de aprobación comercial.
- [ ] Recopilar datos mínimos consentidos y aplicar controles de privacidad.
- [ ] Crear celdillas verificadas listas para ingreso **manual** a Dropi.

> Los hitos no implican promesa de funcionamiento continuo sin supervisión ni costos de servicios de terceros.
