# Estado real de ZOLVANI

**Versión:** 0.1.0-preview.1 (preliminar, NO estable 0.1.0)
**Alcance:** Motor y panel locales con simulación comprobable; sin IA real.
**Fecha:** 2026-10-23

## Realizado

- Reina asigna automáticamente seis especialidades lógicas.
- Cola serial, estados, inspección demo, persistencia y recuperación tras reinicio.
- Panel navegador con Colmena 3D ligera y productos/celdillas de prueba.
- Servidor restringido a loopback, tests básicos, estructura Git y documentos.

## Resultado de pruebas de creación

- `npm run check`: APROBADO (4 archivos JavaScript comprobados).
- `npm test`: **6 de 6 pruebas APROBADAS**, cubriendo asignación, validaciones, flujo demo, recuperación, duplicados y API.
- Pruebas realizadas en Node.js v22 Linux (entorno de construcción).
- **No se ha validado aún en el computador Windows del propietario.**

## Pendiente

- Conectar Codex real y validarlo en Windows.
- Descargar y evaluar fuente completa de Agentes_IA_3D para adaptación por módulos.
- Integrar Three.js/React si se elige, sin perder la funcionalidad del simulador.
- Probar Dropi, WhatsApp Business y redes con documentación oficial y consentimiento en fases posteriores.

## Seguridad

No se ha usado dinero ni generado pedidos comerciales. La app simula todo. No incorporar datos reales ni abrir puertos públicos.

## Comandos

- Arranque: `node server\index.mjs`
- Pruebas: `npm.cmd run check` y `npm.cmd test`
- Panel: http://127.0.0.1:4173

## Git

- Rama de entrega: `main`
- Rama de trabajo preparada: `develop`
- Etiqueta: `v0.1.0-preview.1`

## Próximo paso recomendado

Cuando se restablezca el límite de Codex: abrir `Z:\Zolvani` en Codex, leer `AGENTS.md`, revisar `ROADMAP.md`, realizar validación en Windows y desarrollar el adaptador de ejecución real con controles.
