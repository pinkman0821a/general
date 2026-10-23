# Instrucciones para Codex — Zolvani

## Propósito permanente

Desarrollar Zolvani: La Colmena, negocio automatizado con Reina coordinadora, seis abejas, huevos (tareas) y celdillas (pedidos). El propietario **solamente quiere registrar pedidos verificados manualmente en Dropi** cuando llegue esa etapa.

## Raíz y límites

- Trabajar exclusivamente dentro de `Z:\Zolvani` y conservar el espacio total de la partición (20 GB).
- Antes de cambiar código, ejecutar `git status` y revisar los documentos del proyecto.
- Utilizar versiones semánticas; la versión de entrega es `v0.1.0-preview.1`. La versión `v0.1.0` estable todavía NO se ha alcanzado.
- No ejecutar `git push`, no comprar servicios ni desactivar protección del sistema.
- No borrar la implementación simulada que ya funciona sin una estrategia de migración y regresión.
- Mantener trazabilidad y tests. Preferir commits pequeños, documentación actualizada y desarrollo en `develop`.
- No trabajar sobre otros proyectos ni rutas fuera de Zolvani.

## Referencia técnica

Repositorio a investigar e integrar: https://github.com/ederland/Agentes_IA_3D, licencia MIT. La base entregada en ZIP es independiente y NO incorpora los archivos originales. Clonar el original en un subdirectorio temporal dentro de Zolvani, revisar LICENCIA/README/archivos, preservar atribuciones. No reemplazar todo sin tests. Priorizar un plan de fusión incremental de su UI React/Three.js si aporta valor.

## Realidad del sistema

- El motor actual es un **simulador determinista**, no Codex. Los resultados no son investigación real, ni precios/stock de Dropi.
- El panel dibuja una vista 3D proyectada con Canvas, no utiliza Three.js por ahora.
- El simulador sirve para demostrar colas, asignación, persistencia, inspección y observabilidad.
- Para conectar Codex, primero verificar versión y opciones instaladas de CLI y usar adaptador desacoplado con permisos mínimos y procesos supervisados. No lanzar procesos recursivos de Codex durante la propia sesión de desarrollo.

## Prohibiciones

- No publicar anuncios ni mandar WhatsApp reales, no contactar clientes, no crear pedidos en Dropi.
- No inventar precios, referencias, stock, reseñas ni ganancias. Los datos ficticios van marcados DEMO.
- No guardar datos personales reales de clientes en registros de desarrollo.
- No modificar `.env`, credenciales, llaves privadas ni políticas de seguridad globales sin autorización.
- No exponer la API local a 0.0.0.0 ni publicar el servidor sin autenticación y endurecimiento.

## Próximo objetivo

Convertir `v0.1.0-preview.1` en una versión estable `v0.1.0` con integración real de Codex para un trabajo interno inofensivo, trazabilidad, límites de consumo y fallback simulado, sin depender de integraciones comerciales. Solo marcar estable tras verificación real e incluir evidencia de pruebas.

## Validación

```powershell
npm.cmd run check
npm.cmd test
```

Documentar pruebas y bloqueos en `ESTADO_PROYECTO.md` y `CHANGELOG.md`.
