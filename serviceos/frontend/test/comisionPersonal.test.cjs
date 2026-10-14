const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { render } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const Comision = require('../src/components/tecnico/ComisionPersonal.tsx').default;
const Dashboard = require('../src/components/tecnico/DashboardTecnico.tsx').default;
const React = require('react');

test('Comisión personal consulta sin identidad ni mes, muestra COP y conteo sin información global', async () => {
  const anterior = global.fetch, llamadas = [];
  global.fetch = async (url, opciones) => { llamadas.push({ url, opciones }); return Response.json({ mes: '2026-10', pago_generado: 230000, servicios_con_pago: 3 }); };
  const componente = montar(Comision, { habilitado: true });
  try {
    assert.match(render(Comision, { habilitado: true }), /Cargando tu comisión/);
    componente.render(); componente.activar(); await terminar();
    const html = require('react-dom/server').renderToStaticMarkup(componente.render());
    assert.match(html, /\$ 230.000/); assert.match(html, /octubre de 2026/); assert.match(html, /3 servicios con pago/);
    assert.doesNotMatch(html, /ranking|Todo el equipo|Pago técnicos del mes|Carlos/);
    assert.equal(llamadas[0].url, '/api/tecnico/resumen-financiero');
    assert.equal(llamadas[0].opciones.credentials, 'include');
    componente.desmontar(); assert.equal(llamadas[0].opciones.signal.aborted, true);
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('Sin sesión técnica no consulta; errores no inventan saldo y permiten reintentar', async () => {
  const anterior = global.fetch; let llamadas = 0;
  global.fetch = async () => { llamadas++; return Response.json({ message: 'Error financiero' }, { status: 500 }); };
  const componente = montar(Comision, { habilitado: false });
  try {
    componente.render(); componente.activar(); await terminar(); assert.equal(llamadas, 0);
    componente.render({ habilitado: true }); componente.activar(); await terminar();
    let arbol = componente.render();
    assert.match(require('react-dom/server').renderToStaticMarkup(arbol), /Error financiero/);
    encontrarTodos(arbol, nodo => nodo.type === 'button')[0].props.onClick();
    arbol = componente.render(); componente.activar(); await terminar(); assert.equal(llamadas, 2);
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('Comisión ocupa introducción antes de KPIs, grid adaptable sin alterar agenda', () => {
  const html = render(Dashboard, { nombre: 'Andres', servicios: [], cargando: false, error: '', reintentar() {}, comision: React.createElement('div', {}, 'Comisión propia') });
  assert.ok(html.indexOf('Hola, Andres') < html.indexOf('Comisión propia'));
  assert.ok(html.indexOf('Comisión propia') < html.indexOf('tecnico-kpis'));
  assert.match(html, /Pendientes/); assert.match(html, /Sin servicios próximos/);
  const css = fs.readFileSync(require.resolve('../src/styles/tecnicoInicio.css'), 'utf8');
  assert.match(css, /\.tecnico-introduccion \{ display: grid; gap/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto; align-items: center/);
});
