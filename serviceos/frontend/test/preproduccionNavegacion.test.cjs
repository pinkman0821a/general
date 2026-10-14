const assert = require('node:assert/strict');
const test = require('node:test');
const { render } = require('./serviciosTestAyudas.cjs');
const GlobalTopbar = require('../src/components/GlobalTopbar.tsx').default;
const { menuPrincipal } = require('../src/data/menuPrincipal.ts');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const Gate = require('../src/components/CoordinadorGate.tsx').default;
const AuthGate = require('../src/components/AuthGate.tsx').default;
const AppRoutes = require('../src/routes/AppRoutes.tsx').default;

test('Barra global no ofrece notificaciones inexistentes; menú conserva Oficina y rutas reales', () => {
  const html = render(GlobalTopbar, {});
  assert.doesNotMatch(html, /Notificaciones|notification-dot/);
  assert.equal(menuPrincipal.find(item => item.ruta === '/maquinas').nombre, 'Oficina');
  assert.deepEqual(menuPrincipal.map(item => item.ruta), ['/', '/agenda', '/servicios', '/tecnicos', '/maquinas', '/finanzas']);
  assert.ok(menuPrincipal.every(item => !['Clientes', 'Taller'].includes(item.nombre)));
});

test('Todas las rutas administrativas están protegidas; Oficina y Servicios conservan acceso autenticado', () => {
  const rutas = AppRoutes();
  const coordinador = encontrarTodos(rutas, elemento => elemento.props?.element?.type === Gate)[0];
  for (const ruta of ['/', '/agenda', '/tecnicos', '/finanzas', '/ajustes']) {
    assert.equal(encontrarTodos(coordinador, elemento => elemento.props?.path === ruta).length, 1);
  }
  const autenticado = encontrarTodos(rutas, elemento => elemento.props?.element?.type === AuthGate)[0];
  for (const ruta of ['/taller', '/maquinas', '/servicios', '/tecnico']) {
    assert.equal(encontrarTodos(autenticado, elemento => elemento.props?.path === ruta).length, 1);
  }
  assert.equal(encontrarTodos(rutas, elemento => elemento.props?.path === '/clientes').length, 0);
});

test('Sesión ausente vuelve a login y técnico no entra al contenedor administrativo', async () => {
  const anterior = global.fetch;
  try {
    for (const [Componente, respuesta, destino] of [[AuthGate, new Response('', { status: 401 }), '/login'],
      [Gate, Response.json({ usuario: { id: 2, nombre: 'Juan', rol: 'tecnico' } }), '/tecnico'],
      [Gate, new Response('', { status: 401 }), '/login']]) {
      global.fetch = async () => respuesta;
      const componente = montar(Componente, {});
      componente.render(); componente.activar(); await terminar();
      assert.equal(componente.render().props.to, destino);
      componente.desmontar();
    }
  } finally { global.fetch = anterior; }
});
