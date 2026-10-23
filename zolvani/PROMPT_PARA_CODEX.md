# Continuación de desarrollo — pegar en Codex cuando vuelva a haber cupo

Trabaja en `Z:\Zolvani`. Ya existe una base ejecutable **v0.1.0-preview.1** con Git, una Reina, seis abejas, simulador, API local, vista 3D ligera y seis tests automáticos.

1. Primero lee `AGENTS.md`, `README.md`, `ROADMAP.md` y `ESTADO_PROYECTO.md`. Revisa `git status`, `git log -3`, `git branch -a`, `node --version` y ejecuta `npm.cmd test` y `npm.cmd run check`.
2. Trabaja en rama `develop` y realiza commits pequeños; no modificar otros proyectos ni rutas fuera de Zolvani. No subas nada a GitHub.
3. Investiga y descarga dentro del proyecto como **referencia externa separada** el repositorio `https://github.com/ederland/Agentes_IA_3D`. Conserva su licencia, atribución y autoría. Compara arquitectura, renderizado Three.js y flujo de tareas con nuestro prototipo. No sustituyas indiscriminadamente la base que funciona.
4. Objetivo principal: diseñar e implementar un adaptador que permita a una abeja ejecutar una tarea interna simple con `codex exec` (o integración oficial adecuada), con permisos restringidos, control de duración, registros, límites de consumo, salida JSON validada y fallback demo. Verifica las opciones disponibles de Codex en el equipo en vez de inventarlas. No ejecutar Codex recursivamente desde tu propia sesión de desarrollo sin aislar las pruebas.
5. Mantén apagadas las integraciones reales de Dropi, WhatsApp, Instagram, Facebook y TikTok. No comprar servicios ni gastar dinero sin aprobación.
6. Comprueba funcionamiento en Windows, ejecuta tests, documenta evidencia, modifica `CHANGELOG.md`, `ROADMAP.md` y `ESTADO_PROYECTO.md`. No declares versión estable hasta verificar un ciclo real.
7. Si aparece bloqueo por cuota, credenciales o permisos, documenta la causa y continúa solo con tareas independientes y seguras.

Entrega un resumen de cambios, comandos para reproducirlos, pruebas y siguiente paso. No generes afirmaciones falsas sobre pedidos, stock, ventas ni resultados reales.
