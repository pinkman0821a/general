const assert = require('node:assert/strict');
const { test } = require('node:test');
require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const { agenda, inicio } = require('./operacionAyudas.cjs');
const Agenda = require('../src/pages/AgendaPage.tsx').default;
const Inicio = require('../src/pages/InicioPage.tsx').default;
const Calendario = require('../src/components/operacion/CalendarioAgenda.tsx').default;
const Selector = require('../src/components/operacion/SelectorMesAgenda.tsx').default;
const Detalle = require('../src/components/operacion/DetalleDiaAgenda.tsx').default;
const Stats = require('../src/components/StatsGrid.tsx').default;
const api = require('../src/services/agendaService.ts');
const AppRoutes = require('../src/routes/AppRoutes.tsx').default;
const Gate = require('../src/components/CoordinadorGate.tsx').default;

test('Agenda e Inicio están dentro de CoordinadorGate', () => {
  const gate = encontrarTodos(AppRoutes(), nodo => nodo.props?.element?.type === Gate)[0];
  for (const path of ['/', '/agenda']) assert.equal(encontrarTodos(gate, nodo => nodo.props?.path === path).length, 1);
});

test('Inicio consulta una API agregada con credenciales y reemplaza carga por datos reales', async () => {
  const anterior = global.fetch, llamadas = [];
  global.fetch = async (url, opciones) => { llamadas.push({ url, opciones }); return Response.json(inicio); };
  const pagina = montar(Inicio, {});
  try {
    assert.equal(encontrarTodos(pagina.render(), nodo => nodo.props?.role === 'status').length, 1);
    pagina.activar(); await terminar();
    const arbol = pagina.render();
    assert.deepEqual(encontrarTodos(arbol, nodo => nodo.type === Stats)[0].props.datos.resumen, inicio.resumen);
    assert.equal(llamadas.length, 1); assert.equal(llamadas[0].url, '/api/inicio/resumen');
    assert.equal(llamadas[0].opciones.credentials, 'include');
  } finally { pagina.desmontar(); global.fetch = anterior; }
});

test('Agenda cambia mes, aborta carga antigua, selecciona día/técnico y abre detalle correcto', async () => {
  const anterior = global.fetch, pendientes = [];
  global.fetch = (url, opciones) => new Promise(resolve => pendientes.push({ url, opciones, resolve }));
  const pagina = montar(Agenda, {});
  try {
    let arbol = pagina.render(); pagina.activar();
    encontrarTodos(arbol, nodo => nodo.type === Selector)[0].props.cambiar('2026-09');
    arbol = pagina.render(); pagina.activar();
    assert.equal(pendientes[0].opciones.signal.aborted, true);
    assert.equal(pendientes[1].url, '/api/agenda?mes=2026-09');
    const septiembre = { ...agenda, mes: '2026-09', dias: agenda.dias.slice(0, 30).map(d => ({ ...d, fecha: d.fecha.replace('2026-10', '2026-09') })) };
    pendientes[1].resolve(Response.json(septiembre)); await terminar();
    pendientes[0].resolve(Response.json(agenda)); await terminar();
    arbol = pagina.render();
    const calendario = encontrarTodos(arbol, nodo => nodo.type === Calendario)[0];
    assert.equal(calendario.props.datos.mes, '2026-09');
    calendario.props.seleccionar('2026-09-15', 3);
    arbol = pagina.render();
    const detalle = encontrarTodos(arbol, nodo => nodo.type === Detalle)[0];
    assert.equal(detalle.props.dia.fecha, '2026-09-15'); assert.equal(detalle.props.tecnicoSeleccionado, 3);
  } finally { pagina.desmontar(); global.fetch = anterior; }
});

for (const Pagina of [Agenda, Inicio]) test(`${Pagina.name}: error no muestra valores ficticios y reintento obtiene datos`, async () => {
  const anterior = global.fetch; let llamadas = 0;
  global.fetch = async () => ++llamadas === 1 ? Response.json({ message: 'D1 no disponible' }, { status: 500 }) : Response.json(Pagina === Agenda ? agenda : inicio);
  const pagina = montar(Pagina, {});
  try {
    pagina.render(); pagina.activar(); await terminar();
    let arbol = pagina.render();
    assert.equal(encontrarTodos(arbol, nodo => nodo.props?.role === 'alert').length, 1);
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === Calendario || nodo.type === Stats).length, 0);
    encontrarTodos(arbol, nodo => nodo.type === 'button')[0].props.onClick();
    pagina.render(); pagina.activar(); await terminar(); arbol = pagina.render();
    assert.equal(encontrarTodos(arbol, nodo => nodo.props?.role === 'alert').length, 0);
    assert.equal(llamadas, 2);
  } finally { pagina.desmontar(); global.fetch = anterior; }
});

test('API operativa conserva errores de negocio, sesión, permisos, red y respuesta inválida', async () => {
  const anterior = global.fetch;
  try {
    for (const [status, patron] of [[400, /Mes inválido/], [401, /sesión expiró/], [403, /reservada al coordinador/], [500, /Mes inválido/]]) {
      global.fetch = async () => Response.json({ message: 'Mes inválido' }, { status });
      await assert.rejects(api.consultarOperacion('/api/agenda?mes=incorrecto'), patron);
    }
    global.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(api.consultarOperacion('/api/inicio/resumen'), /No se pudo conectar/);
    global.fetch = async () => new Response('Inválido');
    await assert.rejects(api.consultarOperacion('/api/inicio/resumen'), /No se pudo consultar/);
  } finally { global.fetch = anterior; }
});
