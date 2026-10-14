const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo, tecnicos } = require('./serviciosTestAyudas.cjs');
const Pagina = require('../src/pages/ServiciosPage.tsx').default;
const { FichaServicio } = require('../src/components/servicios/DetalleServicio.tsx');
const Lista = require('../src/components/servicios/ListaServicios.tsx').default;
const Badge = require('../src/components/servicios/EstadoServicio.tsx').default;
const { contarEstados } = require('../src/components/servicios/serviciosAyudas.ts');
const usuario = { id: 2, nombre: 'Juan', user: 'juan', rol: 'tecnico' };

for (const coordinador of [false, true]) {
  test(`Acciones y filtro técnico según rol: ${coordinador ? 'coordinador' : 'técnico'}`, () => {
    const html = render(Pagina, { usuario: { ...usuario, rol: coordinador ? 'coordinador' : 'tecnico' } });
    assert.equal(html.includes('Nuevo servicio'), coordinador);
    assert.equal(html.includes('<label>Técnico'), coordinador);
    assert.match(html, /type="month"[^>]*value="\d{4}-\d{2}"/);
    const detalle = render(FichaServicio, { servicio: ejemplo, coordinador, tecnico: 'Juan', ocupado: false,
      cerrar() {}, editar() {}, cambiarEstado() {} });
    assert.equal(detalle.includes('>Editar<'), coordinador);
    assert.equal(detalle.includes('Técnico asignado'), coordinador);
    assert.match(detalle, /Cambiar estado/);
    assert.doesNotMatch(detalle, /Tarjetería|Cabezal|Observaciones|pago_tecnico/);
    const lista = render(Lista, { lista: [ejemplo], coordinador, tecnicos, cargando: false, error: '',
      seleccionado: null, ocupado: false, abrir() {}, reintentar() {} });
    assert.equal(lista.includes('Juan'), coordinador);
    for (const texto of ['Publicidad ABC', 'Servicio presencial', 'Plotter', 'Pendiente', '2026-10-15']) assert.ok(lista.includes(texto));
  });
}

test('Badges muestran los tres estados con sus clases y etiquetas', () => {
  for (const [estado, texto] of [['pendiente', 'Pendiente'], ['en_proceso', 'En proceso'], ['realizado', 'Realizado']]) {
    const html = render(Badge, { estado });
    assert.ok(html.includes(`servicios-estado ${estado}`)); assert.ok(html.includes(texto));
  }
});

test('Contadores describen exclusivamente los resultados visibles', () => {
  assert.deepEqual(contarEstados([ejemplo, { ...ejemplo, estado: 'realizado' }]), { pendiente: 1, en_proceso: 0, realizado: 1 });
  assert.deepEqual(contarEstados([]), { pendiente: 0, en_proceso: 0, realizado: 0 });
});

test('Enlace antiguo de calendario redirige al detalle dedicado sin renderizar controles del listado', () => {
  const router = require('react-router-dom');
  const cache = require.cache[require.resolve('react-router-dom')];
  cache.exports = { ...router, useNavigate: () => () => {}, useLocation: () => ({ state: null }),
    useSearchParams: () => [new URLSearchParams('mes=2026-09&servicio=9'), () => {}] };
  delete require.cache[require.resolve('../src/pages/ServiciosPage.tsx')];
  const Componente = require('../src/pages/ServiciosPage.tsx').default;
  const { montar } = require('./hooksPrueba.cjs');
  const pagina = montar(Componente, { usuario: { ...usuario, rol: 'coordinador' } });
  try {
    const arbol = pagina.render();
    assert.equal(arbol.props.to, '/servicios/9');
    assert.equal(arbol.props.state.volverServicios, '/servicios?mes=2026-09');
  } finally { pagina.desmontar(); cache.exports = router; delete require.cache[require.resolve('../src/pages/ServiciosPage.tsx')]; }
});
