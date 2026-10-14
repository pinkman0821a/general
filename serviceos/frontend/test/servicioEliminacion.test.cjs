const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo, tecnicos } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const Modulo = require('../src/components/servicios/EliminarServicio.tsx');
const Eliminar = Modulo.default;
const Confirmar = Modulo.ConfirmarEliminacion;
const Formulario = require('../src/components/servicios/FormularioServicio.tsx').default;
const Detalle = require('../src/components/servicios/DetalleServicio.tsx').default;
const { FichaServicio } = require('../src/components/servicios/DetalleServicio.tsx');
const botones = arbol => encontrarTodos(arbol, nodo => nodo.type === 'button');
const confirmacion = arbol => encontrarTodos(arbol, nodo => nodo.type === Confirmar)[0];
function preparar(props = {}) {
  return montar(Eliminar, { id: 9, coordinador: true, ocupado: false, onOcupado() {}, alEliminar() {}, ...props });
}

test('Solo coordinador ve acción peligrosa; edición sigue disponible y formulario la integra solo en servicio existente', () => {
  for (const coordinador of [false, true]) {
    const html = render(Eliminar, { id: 9, coordinador, ocupado: false, onOcupado() {}, alEliminar() {} });
    assert.equal(html.includes('Eliminar servicio'), coordinador);
    if (coordinador) assert.match(html, /servicios-peligro/);
    assert.equal(render(FichaServicio, { servicio: ejemplo, coordinador, tecnico: 'Juan', ocupado: false,
      cerrar() {}, editar() {}, cambiarEstado() {} }).includes('>Editar<'), coordinador);
  }
  const props = { tecnicos, cargandoTecnicos: false, errorTecnicos: '', cancelar() {}, alGuardar() {}, onOcupado() {}, alEliminar() {} };
  assert.match(render(Formulario, { ...props, servicio: ejemplo }), /Eliminar servicio/);
  assert.doesNotMatch(render(Formulario, props), /Eliminar servicio/);
});

test('Confirmación advierte eliminación permanente y Cancelar no hace DELETE', () => {
  const anterior = global.fetch, ocupaciones = [];
  global.fetch = () => assert.fail('Cancelar no debe consultar API');
  const componente = preparar({ onOcupado: valor => ocupaciones.push(valor) });
  try {
    botones(componente.render())[0].props.onClick();
    const dialogo = confirmacion(componente.render());
    const html = render(Confirmar, dialogo.props);
    assert.match(html, /¿Eliminar este servicio\?/);
    assert.match(html, /permanentemente el servicio y sus archivos asociados/);
    assert.match(html, /No se puede deshacer/);
    assert.match(html, /Cancelar/);
    dialogo.props.cancelar();
    assert.equal(confirmacion(componente.render()), undefined);
    assert.deepEqual(ocupaciones, [true, false]);
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('Confirmar envía DELETE autenticado una sola vez, bloquea controles y notifica éxito', async () => {
  const anterior = global.fetch, llamadas = [], eliminados = [];
  let resolver;
  global.fetch = (url, opciones) => { llamadas.push({ url, opciones }); return new Promise(resolve => { resolver = resolve; }); };
  const componente = preparar({ alEliminar: id => eliminados.push(id) });
  try {
    botones(componente.render())[0].props.onClick();
    const dialogo = confirmacion(componente.render());
    dialogo.props.confirmar(); dialogo.props.confirmar(); dialogo.props.cancelar();
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].url, '/api/servicios/9');
    assert.equal(llamadas[0].opciones.method, 'DELETE');
    assert.equal(llamadas[0].opciones.credentials, 'include');
    const pendiente = componente.render();
    assert.equal(botones(pendiente)[0].props.disabled, true);
    const html = render(Confirmar, confirmacion(pendiente).props);
    assert.match(html, /Eliminando/);
    assert.equal((html.match(/disabled=""/g) || []).length, 2);
    resolver(Response.json({ status: 'ok', message: 'Servicio eliminado correctamente.' }));
    await terminar();
    assert.deepEqual(eliminados, [9]);
    assert.equal(confirmacion(componente.render()), undefined);
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('Fallo API conserva detalle, libera bloqueo y muestra error sin éxito falso', async () => {
  const anterior = global.fetch, ocupaciones = [];
  global.fetch = async () => Response.json({ status: 'error', message: 'No se pudo eliminar el servicio.' }, { status: 500 });
  const componente = preparar({ onOcupado: valor => ocupaciones.push(valor), alEliminar() { assert.fail(); } });
  try {
    botones(componente.render())[0].props.onClick(); confirmacion(componente.render()).props.confirmar();
    await terminar();
    const arbol = componente.render();
    assert.equal(botones(arbol)[0].props.disabled, false);
    assert.equal(encontrarTodos(arbol, nodo => nodo.props?.role === 'alert')[0].props.children, 'No se pudo eliminar el servicio.');
    assert.deepEqual(ocupaciones, [true, false]);
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('Detalle técnico no incorpora controles de eliminación', async () => {
  const anterior = global.fetch;
  global.fetch = async () => Response.json({ status: 'ok', servicio: ejemplo });
  const componente = montar(Detalle, { id: 9, coordinador: false, tecnicos, cerrar() {}, editar() {}, alGuardar() {}, onOcupado() {}, alEliminar() {} });
  try {
    componente.render(); componente.activar(); await terminar();
    assert.equal(encontrarTodos(componente.render(), nodo => nodo.type === Eliminar).length, 0);
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('Página dedicada vuelve al listado con mensaje de éxito después de eliminar', () => {
  const router = require('react-router-dom'), cacheRouter = require.cache[require.resolve('react-router-dom')];
  const destinos = [];
  cacheRouter.exports = { ...router, useParams: () => ({ id: '9' }),
    useNavigate: () => (ruta, opciones) => destinos.push({ ruta, opciones }),
    useLocation: () => ({ state: { volverServicios: '/servicios?mes=2026-10' } }) };
  delete require.cache[require.resolve('../src/pages/ServicioDetallePage.tsx')];
  const Pagina = require('../src/pages/ServicioDetallePage.tsx').default;
  const pagina = montar(Pagina, { usuario: { id: 1, rol: 'coordinador' } });
  try {
    const arbol = pagina.render();
    const detalle = encontrarTodos(arbol, nodo => nodo.type === Detalle)[0];
    detalle.props.alEliminar(9);
    assert.deepEqual(destinos, [{ ruta: '/servicios?mes=2026-10', opciones: {
      replace: true, state: { mensajeServicios: 'Servicio eliminado correctamente.' } } }]);
  } finally { pagina.desmontar(); cacheRouter.exports = router; delete require.cache[require.resolve('../src/pages/ServicioDetallePage.tsx')]; }
});
