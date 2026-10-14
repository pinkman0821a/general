const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { render } = require('./serviciosTestAyudas.cjs');
const { inicio } = require('./operacionAyudas.cjs');
const Stats = require('../src/components/StatsGrid.tsx').default;
const Servicios = require('../src/components/AgendaPanel.tsx').default;
const Tecnicos = require('../src/components/TechniciansPanel.tsx').default;
const Crear = require('../src/components/QuickAction.tsx').default;
const PaginaServicios = require('../src/pages/ServiciosPage.tsx').default;

test('Inicio renderiza KPIs de API y navegación útil con filtros de estado', () => {
  const html = render(Stats, { datos: inicio });
  for (const texto of ['Servicios de hoy', 'En proceso', 'Realizados hoy', 'Técnicos libres hoy', '>8<', '>2<', '>3<', '>1<']) assert.ok(html.includes(texto), texto);
  assert.match(html, /href="\/servicios\?mes=2026-10&amp;estado=en_proceso"/);
  assert.match(html, /href="\/servicios\?mes=2026-10&amp;estado=realizado"/);
  assert.match(html, /href="\/agenda"/);
});

test('Lista hoy usa cliente/técnico/ciudad reales, sin horas, enlaces exactos y todos los servicios', () => {
  const html = render(Servicios, { datos: inicio });
  for (const texto of ['Publicidad ABC', 'Juan', 'Bogotá', 'REMOTO', 'Pendiente', 'Ver agenda', 'Ver todos los servicios']) assert.ok(html.includes(texto));
  assert.match(html, /href="\/servicios\/9"/);
  assert.match(html, /href="\/agenda"/);
  assert.doesNotMatch(html, /08:00|10:30|14:00|Impresiones XYZ|Color Print/);
  assert.match(render(Servicios, { datos: { ...inicio, servicios: [], resumen: { ...inicio.resumen, servicios_hoy: 0 } } }), /Hoy no hay servicios programados/);
});

test('Estado técnicos reutiliza disponibilidad, manual, sobrecarga y remoto libre sin ciudades de perfil', () => {
  const html = render(Tecnicos, { tecnicos: inicio.tecnicos });
  for (const texto of ['Disponible', 'No disponible · Viaje', 'Sobrecarga', '2 servicios presenciales', 'Servicio presencial · Bogotá', 'En servicio', '1 remoto']) assert.ok(html.includes(texto), texto);
  assert.doesNotMatch(html, /Medellín|Cali|Miguel Torres|Andrés López/);
  assert.match(render(Tecnicos, { tecnicos: [] }), /No hay técnicos activos/);
});

test('Crear servicio abre formulario por query solo al coordinador; enlaces KPIs inicializan filtro', () => {
  assert.match(render(Crear, {}), /href="\/servicios\?nuevo=1"/);
  const coordinador = { id: 1, nombre: 'Coordinador', user: 'coor', rol: 'coordinador' };
  const nuevo = render(PaginaServicios, { usuario: coordinador }, '/servicios?nuevo=1');
  assert.match(nuevo, /<form/); assert.match(nuevo, /Guardar servicio/);
  const tecnico = render(PaginaServicios, { usuario: { ...coordinador, rol: 'tecnico' } }, '/servicios?nuevo=1');
  assert.doesNotMatch(tecnico, /<form|Guardar servicio/);
  const filtrado = render(PaginaServicios, { usuario: coordinador }, '/servicios?mes=2026-10&estado=en_proceso');
  assert.match(filtrado, /value="en_proceso" selected=""/);
});

test('Datos mock eliminados y responsive Inicio tiene dos columnas KPI y bloques verticales', () => {
  assert.equal(fs.existsSync(require.resolve('../src/data/menuPrincipal.ts').replace('menuPrincipal.ts', 'dashboardData.ts')), false);
  const css = fs.readFileSync(require.resolve('../src/styles/operacion.css'), 'utf8');
  assert.match(css, /\.inicio-page \.stats \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.inicio-page \.dashboard-grid \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /min-height: 44px/);
});
