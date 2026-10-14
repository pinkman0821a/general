const assert = require('node:assert/strict');
const { test } = require('node:test');
require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const { datos, detalle } = require('./finanzasAyudas.cjs');
const api = require('../src/services/finanzasService.ts');
const Pagina = require('../src/pages/FinanzasPage.tsx').default;
const Mes = require('../src/components/finanzas/MesFinanzas.tsx').default;
const Resumen = require('../src/components/finanzas/ResumenFinanzas.tsx').default;
const Detalle = require('../src/components/finanzas/DetalleFinanzasTecnico.tsx').default;
const { FichaFinanzasTecnico } = require('../src/components/finanzas/DetalleFinanzasTecnico.tsx');
const Gate = require('../src/components/CoordinadorGate.tsx').default;
const AppRoutes = require('../src/routes/AppRoutes.tsx').default;

test('Finanzas pertenece a CoordinadorGate y técnico por URL se redirige a /tecnico', async () => {
  const rutas = AppRoutes();
  const contenedor = encontrarTodos(rutas, elemento => elemento.props?.element?.type === Gate)[0];
  assert.equal(encontrarTodos(contenedor, elemento => elemento.props?.path === '/finanzas').length, 1);
  const anterior = global.fetch;
  for (const rol of ['coordinador', 'tecnico']) {
    global.fetch = async () => Response.json({ usuario: { id: 2, nombre: 'Juan', rol } });
    const gate = montar(Gate, {});
    try {
      gate.render(); gate.activar(); await terminar();
      const arbol = gate.render();
      if (rol === 'tecnico') assert.equal(arbol.props.to, '/tecnico');
      else assert.equal(arbol.props.to, undefined);
    } finally { gate.desmontar(); }
  }
  global.fetch = anterior;
});

test('API usa mes e ID explícitos, credenciales y señal; solo recibe resumen agregado', async () => {
  const anterior = global.fetch, llamadas = [];
  global.fetch = async (url, opciones) => { llamadas.push({ url, opciones }); return Response.json(url.includes('/tecnicos/') ? detalle : datos); };
  try {
    const signal = new AbortController().signal;
    assert.equal((await api.obtenerFinanzas('2026-10', signal)).resumen.pago_tecnicos, 1200000);
    assert.equal((await api.obtenerDetalleFinanzas(2, '2026-10', signal)).pago_generado, 200000);
    assert.deepEqual(llamadas.map(llamada => llamada.url), ['/api/finanzas/resumen?mes=2026-10', '/api/finanzas/tecnicos/2?mes=2026-10']);
    assert.ok(llamadas.every(llamada => llamada.opciones.credentials === 'include' && llamada.opciones.signal === signal));
  } finally { global.fetch = anterior; }
});

test('Errores API conservan mensaje, sesión, permiso y conexión; no muestran datos falsos', async () => {
  const anterior = global.fetch;
  try {
    for (const [status, patron] of [[400, /Mes inválido/], [401, /sesión expiró/], [403, /reservado al coordinador/], [500, /Mes inválido/]]) {
      global.fetch = async () => Response.json({ message: 'Mes inválido' }, { status });
      await assert.rejects(api.obtenerFinanzas('2026-10'), patron);
    }
    global.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(api.obtenerFinanzas('2026-10'), /Revisa tu conexión/);
    global.fetch = async () => new Response('Respuesta inválida');
    await assert.rejects(api.obtenerFinanzas('2026-10'), /No se pudo consultar Finanzas/);
  } finally { global.fetch = anterior; }
});

test('Página error, reintento, cambio de mes y aborto de respuesta antigua', async () => {
  const anterior = global.fetch, pendientes = [];
  global.fetch = (url, opciones) => new Promise(resolve => pendientes.push({ url, opciones, resolve }));
  const pagina = montar(Pagina, {});
  try {
    pagina.render(); pagina.activar();
    pendientes[0].resolve(Response.json({ message: 'D1 temporalmente no disponible' }, { status: 500 })); await terminar();
    let arbol = pagina.render();
    assert.equal(encontrarTodos(arbol, elemento => elemento.props?.role === 'alert').length, 1);
    encontrarTodos(arbol, elemento => elemento.type === 'button')[0].props.onClick();
    arbol = pagina.render(); pagina.activar();
    assert.equal(encontrarTodos(arbol, elemento => elemento.type === Resumen).length, 0);
    encontrarTodos(arbol, elemento => elemento.type === Mes)[0].props.cambiar('2026-11');
    pagina.render(); pagina.activar();
    assert.equal(pendientes[1].opciones.signal.aborted, true);
    pendientes[2].resolve(Response.json({ ...datos, mes: '2026-11', resumen: { ...datos.resumen, pago_tecnicos: 50000 } })); await terminar();
    pendientes[1].resolve(Response.json(datos)); await terminar();
    arbol = pagina.render();
    assert.equal(encontrarTodos(arbol, elemento => elemento.type === Resumen)[0].props.datos.resumen.pago_tecnicos, 50000);
  } finally { pagina.desmontar(); global.fetch = anterior; }
});

test('Panel consulta detalle, gestiona carga/error/reintento y permite cerrar', async () => {
  const anterior = global.fetch, llamadas = [];
  let cierres = 0;
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return llamadas.length === 1 ? Response.json({ message: 'No se pudo consultar detalle' }, { status: 500 }) : Response.json(detalle);
  };
  const componente = montar(Detalle, { id: 2, nombre: 'Andres Tecnico', mes: '2026-10', cerrar() { cierres++; } });
  try {
    let arbol = componente.render(); componente.activar();
    assert.equal(encontrarTodos(arbol, elemento => elemento.props?.role === 'status').length, 1);
    await terminar(); arbol = componente.render();
    assert.equal(encontrarTodos(arbol, elemento => elemento.props?.role === 'alert').length, 1);
    encontrarTodos(arbol, elemento => elemento.type === 'button' && elemento.props.children === 'Reintentar detalle')[0].props.onClick();
    componente.render(); componente.activar(); await terminar(); arbol = componente.render();
    assert.equal(encontrarTodos(arbol, elemento => elemento.type === FichaFinanzasTecnico)[0].props.datos.pago_generado, 200000);
    assert.equal(llamadas[0].opciones.signal.aborted, true);
    encontrarTodos(arbol, elemento => elemento.type === 'button' && elemento.props.children === 'Cerrar')[0].props.onClick();
    assert.equal(cierres, 1);
  } finally { componente.desmontar(); global.fetch = anterior; }
});
