# Arquitectura — versión preliminar

```text
Navegador (127.0.0.1:4173)
  ├─ Vista Colmena 3D Canvas / app/hive3d.js
  ├─ Panel Reactivo / app/app.js (fetch cada 1,2 s)
  └─ POST y GET /api/*
           │
Servidor HTTP nativo Node.js / server/index.mjs
           │
     Hive / server/core.mjs
       ├─ Reina: mapeo de tareas -> seis agentes lógicos
       ├─ Motor: cola de ejecución serial
       ├─ Proveedor: simulación determinista (SIN IA)
       ├─ Inspectora: validación de estructura demo
       ├─ Bitácora (máximo 100 entradas)
       └─ Archivo JSON local en data/state.json
```

## Flujo de datos

1. Se crea un huevo en el panel.
2. Reina lo asigna de acuerdo con su tipo.
3. Se guarda la tarea en JSON mediante sustitución atómica.
4. Si el motor está libre, inicia simulación, cambia estado y guarda.
5. Finaliza con un resultado ficticio marcado `DEMO_SIN_IA`.
6. Inspectora comprueba que haya resumen y evidencia (validación **de formato**, NO factual/comercial).
7. Se almacena el estado final y el navegador actualiza la interfaz.

## Sustitución futura por Codex

Extraer `simulate(task)` a interfaz `execute(task, context, limits)`. Implementar `SimulatedProvider` y `CodexProvider`, crear entorno restringido por tarea, manejar interrupciones, registros, límites de consultas, respuestas estructuradas y políticas de herramientas. Ninguna función del proveedor debe permitir por defecto transacciones externas. La prueba con Codex requiere disponibilidad de cuota y confirmación de permisos.

## Integración con proyecto Agentes_IA_3D

La referencia propone React, Vite, Three.js, Firebase y motor Node. Este prototipo ligero no clona ese código. El siguiente desarrollo evaluará importar módulos concretos en vez de duplicar toda su arquitectura, y preservará licencia/autoría del proyecto fuente.
