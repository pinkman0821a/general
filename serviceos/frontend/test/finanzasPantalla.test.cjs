const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { render } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const { datos, detalle, tecnicos } = require('./finanzasAyudas.cjs');
const Pagina = require('../src/pages/FinanzasPage.tsx').default;
const Resumen = require('../src/components/finanzas/ResumenFinanzas.tsx').default;
const Mes = require('../src/components/finanzas/MesFinanzas.tsx').default;
const Ranking = require('../src/components/finanzas/RankingMensual.tsx').default;
const Detalle = require('../src/components/finanzas/DetalleFinanzasTecnico.tsx').default;
const { FichaFinanzasTecnico } = require('../src/components/finanzas/DetalleFinanzasTecnico.tsx');
const ayudas = require('../src/components/finanzas/finanzasAyudas.ts');

test('KPIs globales, COP y comparación mensual con signo y decimal colombiano', () => {
  const html = render(Resumen, { datos });
  for (const texto of ['Ingresos por servicios', 'Servicios con pago', 'Técnicos con actividad', 'Promedio por servicio',
    '$ 800.000', '$ 150.000', '+26,3%', 'septiembre de 2026', '$ 950.000', '+$ 250.000']) assert.ok(html.includes(texto), texto);
  assert.match(html, /Totales del mes seleccionado/);
  assert.doesNotMatch(html, /ya pagado|liquidado/);
  assert.equal(ayudas.formatoCop(1234000), '$ 1.234.000');
  assert.match(ayudas.textoComparacion({ pago_anterior: 400, diferencia: -400, porcentaje: -100 }), /-100,0%/);
});

test('Mes anterior cero muestra texto claro sin porcentaje inválido', () => {
  for (const diferencia of [0, 1200000]) {
    const html = render(Resumen, { datos: { ...datos, comparacion: { mes_anterior: '2026-09', pago_anterior: 0, diferencia, porcentaje: null } } });
    assert.doesNotMatch(html, /Infinity|NaN/);
    assert.match(html, diferencia ? /Sin base para calcular porcentaje/ : /Sin pago generado en ambos meses/);
  }
});

test('Selector muestra mes, anterior/siguiente y entrada mensual estricta, incluido cambio de año', () => {
  const cambios = [];
  const props = { mes: '2026-01', cambiar: mes => cambios.push(mes) };
  const html = render(Mes, props);
  assert.match(html, /enero de 2026/);
  assert.match(html, /type="month"[^>]*value="2026-01"/);
  const arbol = Mes(props);
  const botones = encontrarTodos(arbol, elemento => elemento.type === 'button');
  botones[0].props.onClick(); botones[1].props.onClick();
  const input = encontrarTodos(arbol, elemento => elemento.type === 'input')[0];
  input.props.onChange({ target: { value: '2026-10' } });
  for (const value of ['', '2026-1', '2026-13', '0000-01']) input.props.onChange({ target: { value } });
  assert.deepEqual(cambios, ['2025-12', '2026-02', '2026-10']);
  assert.equal(encontrarTodos(Mes({ ...props, mes: '0001-01' }), elemento => elemento.type === 'button')[0].props.disabled, true);
});

test('Ranking de seis meses, escala independiente, orden recibido, inactivos y selección del mes histórico', () => {
  const meses = datos.historico_tecnicos;
  const html = render(Ranking, { historico: meses, seleccionar() {} });
  assert.equal((html.match(/<section/g) || []).length, 6);
  assert.ok(html.indexOf('octubre') < html.indexOf('septiembre'));
  assert.ok(html.indexOf('Andres Tecnico') < html.indexOf('Carlos Técnico'));
  assert.match(html, /width:100%/);
  assert.match(html, /width:46\.341463/);
  assert.match(html, /Sin comisiones generadas este mes/);
  assert.match(html, /Inactivo/);
  assert.match(html, /\$ 820.000/);
  assert.doesNotMatch(html, /Comisiones por técnico|NaN|Infinity/);
  let seleccionado;
  const arbol = Ranking({ historico: [{ mes: '2026-09', tecnicos }], seleccionar: (tecnico, mes) => { seleccionado = { tecnico, mes }; } });
  encontrarTodos(arbol, elemento => elemento.type === 'button')[1].props.onClick();
  assert.equal(seleccionado.tecnico.id, 3); assert.equal(seleccionado.mes, '2026-09');
});

test('Detalle legible con fecha, cliente, tipo, estado, valor pertinente y total sin comprobantes', () => {
  const html = render(FichaFinanzasTecnico, { datos: detalle });
  for (const texto of ['Cliente ABC', 'Cliente DEF', 'Servicio presencial', 'Instalación', 'Pendiente', 'Realizado',
    'Pago técnico generado', '$ 100.000', 'Total generado', '$ 200.000']) assert.ok(html.includes(texto), texto);
  assert.match(html, /datetime="2026-10-04"/i);
  assert.equal((html.match(/Valor del servicio/g) || []).length, 1);
  assert.match(html, /href="\/servicios\/7"/);
  assert.doesNotMatch(html, /comprobante|Teléfono|Dirección|Máquina|Reasignar|Editar/);
  assert.match(render(FichaFinanzasTecnico, { datos: { ...detalle, servicios: [], pago_generado: 0 } }), /Sin servicios con pago/);
});

test('Página loading, selección de mes histórico y KPIs globales conservados', async () => {
  const anterior = global.fetch, llamadas = [];
  global.fetch = async (url, opciones) => { llamadas.push({ url, opciones }); return Response.json(datos); };
  const pagina = montar(Pagina, {});
  try {
    let arbol = pagina.render();
    assert.match(render(Pagina, {}), /Cargando Finanzas/);
    pagina.activar(); await terminar(); arbol = pagina.render();
    const resumen = encontrarTodos(arbol, elemento => elemento.type === Resumen)[0];
    assert.equal(resumen.props.datos.resumen.pago_tecnicos, 1200000);
    const lista = encontrarTodos(arbol, elemento => elemento.type === Ranking)[0];
    lista.props.seleccionar(tecnicos[1], '2026-09');
    arbol = pagina.render(); pagina.activar();
    const panel = encontrarTodos(arbol, elemento => elemento.type === Detalle)[0];
    assert.equal(panel.props.id, 3); assert.equal(panel.props.nombre, 'Carlos Técnico');
    assert.equal(panel.props.mes, '2026-09');
    assert.equal(llamadas.length, 1);
    assert.equal(encontrarTodos(arbol, elemento => elemento.type === Resumen)[0].props.datos.resumen.pago_tecnicos, 1200000);
    encontrarTodos(arbol, elemento => elemento.type === Mes)[0].props.cambiar('2026-11');
    arbol = pagina.render(); pagina.activar();
    assert.equal(encontrarTodos(arbol, elemento => elemento.type === Detalle).length, 0);
    assert.equal(llamadas[1].url, '/api/finanzas/resumen?mes=2026-11');
  } finally { pagina.desmontar(); global.fetch = anterior; }
});

test('Estructura mobile mantiene KPIs en dos columnas, gráfico adaptable y detalle apilado', () => {
  const css = fs.readFileSync(require.resolve('../src/styles/finanzas.css'), 'utf8');
  assert.match(css, /@media \(max-width: 1000px\)/);
  assert.match(css, /\.finanzas-kpis \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.finanzas-layout\.con-detalle \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.finanzas-barra-fondo \{ grid-column: 2 \/ 4; grid-row: 2/);
  assert.match(css, /min-height: 44px/);
  assert.doesNotMatch(css, /overflow-x: (scroll|auto)|min-width: [789]\d\dpx/);
});
