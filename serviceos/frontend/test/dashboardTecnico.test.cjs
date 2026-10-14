const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo } = require('./serviciosTestAyudas.cjs');
const { montar, terminar, encontrarTodos } = require('./hooksPrueba.cjs');
const Dashboard = require('../src/components/tecnico/DashboardTecnico.tsx').default;
const Inicio = require('../src/pages/TecnicoInicioPage.tsx').default;
const { resumenTecnico, enlaceServicio } = require('../src/components/tecnico/resumenTecnico.ts');

test('KPIs propios, mes actual, hoy y máximo tres próximos ordenados por fecha e id', () => {
  const lista = [
    { ...ejemplo, id: 5, fecha_programada: '2026-10-07' },
    { ...ejemplo, id: 4, fecha_programada: '2026-10-06' },
    { ...ejemplo, id: 3, fecha_programada: '2026-10-06' },
    { ...ejemplo, id: 2, fecha_programada: '2026-10-05', estado: 'en_proceso' },
    { ...ejemplo, id: 1, fecha_programada: '2026-10-05', estado: 'realizado' },
    { ...ejemplo, id: 6, fecha_programada: '2026-09-30', estado: 'realizado' },
    { ...ejemplo, id: 7, fecha_programada: '2026-10-04' },
  ];
  const resumen = resumenTecnico(lista, new Date(2026, 9, 5, 12));
  assert.deepEqual([resumen.pendientes, resumen.enProceso, resumen.realizadosMes, resumen.serviciosHoy], [4, 1, 1, 2]);
  assert.deepEqual(resumen.proximos.map(servicio => servicio.id), [2, 3, 4]);
  assert.equal(enlaceServicio(lista[3]), '/servicios/2');
});

test('Dashboard compacto muestra datos y enlaces exactos, Servicios y Taller', () => {
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const servicios = [1, 2, 3, 4].map(id => ({ ...ejemplo, id, fecha_programada: fecha, cliente_nombre: `Cliente ${id}` }));
  const html = render(Dashboard, { nombre: 'Andres Tecnico', servicios, cargando: false, error: '', reintentar() {} });
  assert.match(html, /Hola, Andres/);
  assert.match(html, /Este es tu resumen de trabajo/);
  assert.match(html, /Pendientes|En proceso|Realizados este mes|Servicios de hoy/);
  assert.match(html, /Próximo servicio/);
  assert.match(html, /Cliente 1/);
  assert.match(html, /Plotter ecosolvente/);
  assert.equal((html.match(/class="tecnico-trabajo"/g) || []).length, 3);
  assert.doesNotMatch(html, /Cliente 4/);
  assert.match(html, /href="\/servicios\/1"/);
  assert.match(html, /href="\/servicios"[^>]*>Ver todos los servicios/);
  assert.match(html, /href="\/taller"[^>]*>Ir a Oficina/);
  assert.match(html, /Recepción y entrega de equipos/);
  assert.doesNotMatch(html, /Crear servicio|Nuevo servicio|Pago técnicos|comprobante|Reasignar/);
});

test('Agenda vacía, carga y error no inventan trabajos ni KPIs', () => {
  const props = { nombre: 'Juan', servicios: [], cargando: false, error: '', reintentar() {} };
  assert.match(render(Dashboard, props), /Sin servicios próximos/);
  assert.match(render(Dashboard, { ...props, cargando: true }), /Cargando trabajos/);
  const error = render(Dashboard, { ...props, error: 'Sin conexión' });
  assert.match(error, /Sin conexión/);
  assert.match(error, /Reintentar/);
  assert.doesNotMatch(error, /Ver servicio</);
});

test('Inicio consulta exclusivamente sesión técnica sin enviar identidad, coordinador redirige', async () => {
  const anterior = global.fetch, llamadas = [];
  const componente = montar(Inicio, {});
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return url === '/api/auth/me' ? Response.json({ status: 'ok', usuario: { id: 2, nombre: 'Juan', rol: 'tecnico' } })
      : Response.json({ status: 'ok', servicios: [{ ...ejemplo, cliente_nombre: 'Propio' }] });
  };
  try {
    componente.render(); componente.activar(); await terminar();
    componente.render(); componente.activar(); await terminar();
    const dashboard = encontrarTodos(componente.render(), elemento => elemento.type === Dashboard)[0];
    assert.equal(dashboard.props.servicios[0].cliente_nombre, 'Propio');
    assert.deepEqual(llamadas.map(llamada => llamada.url), ['/api/auth/me', '/api/servicios?']);
    assert.equal(llamadas[1].opciones.credentials, 'include');
    assert.equal(llamadas[1].url.includes('tecnico_id'), false);
  } finally { componente.desmontar(); global.fetch = anterior; }
  const coordinador = montar(Inicio, {});
  global.fetch = async () => Response.json({ status: 'ok', usuario: { id: 1, nombre: 'Coord', rol: 'coordinador' } });
  try {
    coordinador.render(); coordinador.activar(); await terminar();
    assert.equal(coordinador.render().props.to, '/');
  } finally { coordinador.desmontar(); global.fetch = anterior; }
});
