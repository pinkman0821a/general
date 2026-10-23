# 🐝 ZOLVANI: LA COLMENA

**Primera base ejecutable: `v0.1.0-preview.1`** · 23 de octubre de 2026

Aplicación local para visualizar una organización de agentes de IA con una Reina, seis abejas especializadas, huevos (tareas) y celdillas (pedidos de prueba). Funciona sin conexión a Codex, Firebase, Dropi, WhatsApp ni redes sociales. No ejecuta inteligencia artificial todavía: **el motor de esta versión es explícitamente SIMULADO**. No registra ventas reales.

## ▶ Iniciar en Windows

1. Descomprime el ZIP **directamente en `Z:\Zolvani`** (no dentro de otra carpeta `Zolvani`).
2. Necesitas Node.js **20 o superior**. Puedes comprobarlo en PowerShell con `node --version`.
3. Da doble clic en `scripts\iniciar-zolvani.bat`, o abre PowerShell en `Z:\Zolvani` y ejecuta:

   ```powershell
   node server\index.mjs
   ```

4. Abre <http://127.0.0.1:4173> en el navegador.
5. Pulsa **Ejecutar demostración**. Se crean tres huevos y el motor los resuelve en serie, con validación de la Inspectora y registro de eventos.
6. Detén el servidor con **Ctrl+C**. Los datos de simulación se conservan en `data\state.json` (ignorado por Git).

Si el puerto 4173 está ocupado, en PowerShell puedes usar `$env:PORT=4174; node server\index.mjs` y abrir `http://127.0.0.1:4174`.

> No tienes que ejecutar `npm install`: este primer paquete usa únicamente Node.js y APIs web nativas.

## ✅ Qué funciona ya

- Panel web con vista de **Colmena 3D ligera**. La escena dibuja geometría tridimensional proyectada en un canvas; gira arrastrando el ratón y permite acercar/alejar.
- Reina que asigna huevos automáticamente a seis abejas según especialidad.
- Cola de ejecución de **una tarea a la vez**, persistencia en JSON y recuperación de tareas interrumpidas.
- Ciclo de estados: pendiente → en progreso → verificación → completada/bloqueada.
- Inspectora que valida resultados estructurados **de una simulación**.
- Productos y celdillas ficticios, actividades, métricas y presupuesto inicial de **$130.000 COP** (sin gastos).
- API HTTP restringida a loopback (`127.0.0.1`), control de origen, validación y límite de tamaño para solicitudes.
- 6 pruebas automáticas del motor y servidor HTTP.
- Git inicial con rama `main`, rama `develop` y etiqueta `v0.1.0-preview.1`.

## ❌ Qué NO funciona todavía

- **No hay ejecución de Codex en segundo plano** ni conexión a ningún modelo de IA.
- **No hay integración con Dropi**, catálogo real, precios confirmados ni inventario en tiempo real.
- **No hay WhatsApp Business**, publicación en TikTok, Instagram o Facebook, ni conversaciones reales.
- **No hay Firebase, React ni Three.js integrados** en esta base preliminar. Estos se encuentran en el repositorio de referencia y se evaluarán durante la siguiente etapa.
- No hay permisos multiusuario, autenticación, ni despliegue público; no debes exponer este servicio a Internet.

### Referencia técnica

El objetivo de implementación es **adaptar** https://github.com/ederland/Agentes_IA_3D (licencia MIT). Esta base preliminar se desarrolló de manera **independiente** porque no fue posible descargar todo el repositorio externo en el entorno donde se generó el ZIP. **No es un fork ni contiene sus archivos originales.** La integración con el código original está planificada para Codex. No reemplazar esta implementación funcional a ciegas: primero crear una rama y preservar los tests.

## 🧪 Pruebas

En PowerShell dentro de `Z:\Zolvani`:

```powershell
npm.cmd run check
npm.cmd test
```

También puedes abrir `scripts\probar-zolvani.bat`.

## 🔀 Control de versiones

```powershell
git status
git branch -a
git log --oneline --decorate -5
git tag
```

Se entrega `.git` dentro del ZIP, de manera que la historia y la etiqueta viajan con los archivos. No hay remoto configurado ni se ha publicado código a GitHub. Antes de modificar la base, utilizar `git switch develop`.

## 📂 Carpetas

- `app/` interfaz HTML, CSS, JavaScript y renderer 3D ligero.
- `server/` servidor y núcleo de Reina/abejas/huevos.
- `test/` pruebas automatizadas.
- `data/` datos locales del simulador (no subirlos a Git).
- `scripts/` arranque y pruebas en Windows.
- `docs/` arquitectura y advertencias.
- `AGENTS.md` instrucciones permanentes para Codex.
- `ROADMAP.md`, `CHANGELOG.md`, `ESTADO_PROYECTO.md` y `REPORTE_INICIAL.md`.

## Seguridad

No uses contraseñas, datos reales de clientes, tokens de plataformas ni API keys en tareas de prueba. El prototipo no cuenta con autenticación y está diseñado exclusivamente para `127.0.0.1`. Consulta `docs/SEGURIDAD.md`.

### Licencia

Código de este paquete: MIT, en `LICENSE`. Proyecto de referencia de Ederland: MIT, autoría y avisos del repositorio original deben conservarse cuando se integren sus archivos.
