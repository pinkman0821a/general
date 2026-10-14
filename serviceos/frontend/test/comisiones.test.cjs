const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const Comisiones = require('../src/components/servicios/ComisionesMes.tsx').default;
const api = require('../src/services/comisionesService.ts');

function entornoDescarga() {
  const anteriores = { fetch: global.fetch, document: global.document, crear: URL.createObjectURL, revocar: URL.revokeObjectURL };
  const eventos = [], enlaces = [];
  global.document = {
    createElement() { const enlace = { click() { eventos.push('click'); }, remove() { eventos.push('remove'); } }; enlaces.push(enlace); return enlace; },
    body: { appendChild() { eventos.push('append'); } },
  };
  URL.createObjectURL = blob => { assert.ok(blob instanceof Blob); eventos.push('create'); return 'blob:test'; };
  URL.revokeObjectURL = url => { assert.equal(url, 'blob:test'); eventos.push('revoke'); };
  return { eventos, enlaces, restaurar() {
    global.fetch = anteriores.fetch; global.document = anteriores.document;
    URL.createObjectURL = anteriores.crear; URL.revokeObjectURL = anteriores.revocar;
  } };
}
const botonExportar = arbol => encontrarTodos(arbol, elemento => elemento.type === 'button')[0];

test('Botón Excel por rol y Pago técnicos exclusivamente coordinador', () => {
  const tecnico = render(Comisiones, { mes: '2026-10', coordinador: false, revision: 0 });
  assert.match(tecnico, /Excel de comisiones/);
  assert.doesNotMatch(tecnico, /Pago técnicos del mes|Exportar comisiones/);
  const coordinador = render(Comisiones, { mes: '2026-10', coordinador: true, revision: 0 });
  assert.match(coordinador, /Exportar comisiones/);
  assert.match(coordinador, /Pago técnicos del mes/);
});

test('Descarga Blob por mes, respeta Content-Disposition y revoca URL', async () => {
  const entorno = entornoDescarga();
  global.fetch = async (url, opciones) => {
    assert.equal(url, '/api/servicios/comisiones.xlsx?mes=2026-10');
    assert.equal(opciones.credentials, 'include');
    return new Response('xlsx', { headers: { 'Content-Disposition': 'attachment; filename="comisiones-juan-2026-10.xlsx"' } });
  };
  try {
    await api.descargarComisiones('2026-10');
    assert.equal(entorno.enlaces[0].download, 'comisiones-juan-2026-10.xlsx');
    assert.deepEqual(entorno.eventos, ['create', 'append', 'click', 'remove', 'revoke']);
  } finally { entorno.restaurar(); }
});

test('Revoca URL y retira enlace incluso si falla el clic', async () => {
  const entorno = entornoDescarga();
  global.fetch = async () => new Response('xlsx');
  global.document.createElement = () => ({ click() { throw new Error('clic falló'); }, remove() { entorno.eventos.push('remove'); } });
  try {
    await assert.rejects(api.descargarComisiones('2026-09'), /clic falló/);
    assert.deepEqual(entorno.eventos, ['create', 'append', 'remove', 'revoke']);
  } finally { entorno.restaurar(); }
});

test('Doble envío queda bloqueado inmediatamente; usa mes vigente y muestra error sin realizados', async () => {
  const entorno = entornoDescarga();
  const llamadas = [];
  let resolver;
  global.fetch = (url, opciones) => { llamadas.push({ url, opciones }); return new Promise(resolve => { resolver = resolve; }); };
  const componente = montar(Comisiones, { mes: '2026-09', coordinador: false, revision: 0 });
  try {
    const arbol = componente.render({ mes: '2026-10', coordinador: false, revision: 0 });
    const boton = botonExportar(arbol);
    boton.props.onClick(); boton.props.onClick();
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].url, '/api/servicios/comisiones.xlsx?mes=2026-10');
    assert.equal(botonExportar(componente.render()).props.disabled, true);
    resolver(Response.json({ codigo: 'sin_servicios_realizados', message: 'No hay servicios realizados que generen comisión en este mes.' }, { status: 400 }));
    await terminar();
    assert.equal(botonExportar(componente.render()).props.disabled, false);
    const error = encontrarTodos(componente.render(), elemento => elemento.props?.role === 'alert')[0];
    assert.match(error.props.children, /No hay servicios realizados/);
    assert.deepEqual(entorno.eventos, []);
  } finally { componente.desmontar(); entorno.restaurar(); }
});

test('Resumen solo mes, formato COP, aborto al cambiar mes y ausencia de consulta para técnico', async () => {
  const anterior = global.fetch, llamadas = [];
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return Response.json({ status: 'ok', pago_tecnicos: 1234000 });
  };
  const coordinador = montar(Comisiones, { mes: '2026-10', coordinador: true, revision: 0 });
  const tecnico = montar(Comisiones, { mes: '2026-10', coordinador: false, revision: 0 });
  try {
    coordinador.render(); coordinador.activar(); await terminar();
    assert.equal(encontrarTodos(coordinador.render(), elemento => elemento.type === 'strong')[0].props.children, '$ 1.234.000');
    coordinador.render({ mes: '2026-11', coordinador: true, revision: 0 }); coordinador.activar(); await terminar();
    assert.equal(llamadas[0].opciones.signal.aborted, true);
    assert.deepEqual(llamadas.map(llamada => llamada.url), ['/api/servicios/resumen-pagos?mes=2026-10', '/api/servicios/resumen-pagos?mes=2026-11']);
    tecnico.render(); tecnico.activar(); await terminar();
    assert.equal(llamadas.length, 2);
  } finally { coordinador.desmontar(); tecnico.desmontar(); global.fetch = anterior; }
});
