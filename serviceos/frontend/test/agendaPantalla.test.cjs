const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { render } = require('./serviciosTestAyudas.cjs');
const { encontrarTodos } = require('./hooksPrueba.cjs');
const { agenda, disponible } = require('./operacionAyudas.cjs');
const Calendario = require('../src/components/operacion/CalendarioAgenda.tsx').default;
const Selector = require('../src/components/operacion/SelectorMesAgenda.tsx').default;
const Detalle = require('../src/components/operacion/DetalleDiaAgenda.tsx').default;
const { calendarioAgenda } = require('../src/components/operacion/agendaAyudas.ts');

test('Calendario domingo a sábado, mes completo, día actual, leyenda y todos los estados reales', () => {
  const html = render(Calendario, { datos: agenda, seleccionado: '2026-10-15', seleccionar() {} });
  assert.equal((html.match(/class="agenda-semana"/g) || []).length, 7);
  assert.ok(html.indexOf('>Dom<') < html.indexOf('>Lun<'));
  assert.equal((html.match(/class="agenda-dia"/g) || []).length, 31);
  for (const texto of ['Leyenda de disponibilidad', 'Disponible', 'Servicio programado', 'No disponible', 'Sobrecarga',
    'Servicio presencial · Bogotá', 'No disponible · Viaje', '2 servicios presenciales', '1 remoto']) assert.ok(html.includes(texto), texto);
  assert.match(html, /aria-current="date"/);
  assert.match(html, /agenda-celda hoy seleccionada/);
  const remoto = encontrarTodos(Calendario({ datos: agenda, seleccionado: '', seleccionar() {} }), nodo => nodo.type === 'button' && nodo.props.title?.startsWith('Carlos'))[0];
  assert.match(remoto.props.className, /disponible/);
  assert.equal(calendarioAgenda('2026-10')[4], '2026-10-01');
  assert.equal(calendarioAgenda('2024-02').filter(Boolean).length, 29);
  assert.equal(calendarioAgenda('2026-02').filter(Boolean).length, 28);
});

test('Seleccionar día o chip conserva fecha/técnico correctos', () => {
  const elegidos = [];
  const arbol = Calendario({ datos: agenda, seleccionado: '', seleccionar: (...args) => elegidos.push(args) });
  encontrarTodos(arbol, nodo => nodo.type === 'button' && nodo.props.className === 'agenda-dia')[14].props.onClick();
  encontrarTodos(arbol, nodo => nodo.type === 'button' && nodo.props.title?.startsWith('Carlos'))[0].props.onClick();
  assert.deepEqual(elegidos, [['2026-10-15'], ['2026-10-15', 3]]);
});

test('Selector mensual permite anterior/siguiente, input y cambio de año sin meses inválidos', () => {
  const cambios = [];
  const props = { mes: '2026-01', cambiar: mes => cambios.push(mes) };
  assert.match(render(Selector, props), /enero de 2026/);
  assert.match(render(Selector, props), /type="month"/);
  const arbol = Selector(props);
  const botones = encontrarTodos(arbol, nodo => nodo.type === 'button');
  botones[0].props.onClick(); botones[1].props.onClick();
  const input = encontrarTodos(arbol, nodo => nodo.type === 'input')[0];
  for (const value of ['2026-08', '', '2026-1', '2026-13', '0000-01']) input.props.onChange({ target: { value } });
  assert.deepEqual(cambios, ['2025-12', '2026-02', '2026-08']);
});

test('Detalle tiene fecha, cliente, máquina, ciudad, estado, remotos separados y servicio exacto', () => {
  const html = render(Detalle, { dia: agenda.dias[14], tecnicoSeleccionado: 3 });
  for (const texto of ['15 de octubre de 2026', 'Cliente: Publicidad ABC', 'Máquina: Plotter', 'Ciudad: Bogotá',
    'Pendiente', 'Servicios presenciales', 'Servicios remotos · no ocupan agenda presencial', 'Ciudad: REMOTO']) assert.ok(html.includes(texto), texto);
  assert.match(html, /href="\/servicios\/9"/);
  assert.match(html, /href="\/servicios\/10"/);
  assert.ok(html.indexOf('Carlos') < html.indexOf('Juan'));
  assert.doesNotMatch(html, /comprobante|08:00|10:30/);
  assert.match(render(Detalle, { dia: { fecha: '2026-10-16', tecnicos: [disponible] } }), /Sin servicios programados/);
  assert.match(render(Detalle, { dia: { fecha: '2026-10-16', tecnicos: [] } }), /No hay técnicos/);
  assert.match(render(Detalle, { dia: { fecha: '2026-10-16', tecnicos: [{ ...disponible, activo: 0 }] } }), /Inactivo/);
});

test('Agenda mobile conserva siete columnas, oculta chips y muestra indicadores con detalle vertical', () => {
  const css = fs.readFileSync(require.resolve('../src/styles/agenda.css'), 'utf8');
  assert.match(css, /repeat\(7, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 800px\)/);
  assert.match(css, /\.agenda-chips \{ display: none/);
  assert.match(css, /\.agenda-indicadores \{ display: flex/);
  assert.match(css, /\.agenda-detalle-tecnicos \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /overflow-x: (auto|scroll)/);
});
