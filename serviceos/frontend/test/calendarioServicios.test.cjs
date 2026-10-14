const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo } = require('./serviciosTestAyudas.cjs');
const React = require('react');
const { agruparPresenciales, consultarServiciosCalendario } = require('../src/components/serviciosCalendario.ts');
const { useServiciosCalendario } = require('../src/components/useServiciosCalendario.ts');
const { useTecnicoDisponibilidad } = require('../src/components/useTecnicoDisponibilidad.ts');
const { construirCalendario } = require('../src/components/calendarioDisponibilidad.ts');
const Dia = require('../src/components/DiaDisponibilidad.tsx').default;
const DetalleDia = require('../src/components/DetalleServiciosDia.tsx').default;

const dia = (cantidad, noDisponible = false) => render(Dia, {
  fecha: '2026-10-07', dia: 7, cantidad, noDisponible, seleccionado: true,
  sinConsultar: false, serviciosSinConsultar: false, deshabilitado: false, seleccionar() {},
});

test('Agrupa solo garantía, servicio presencial e instalación en su día exacto', () => {
  const tipos = ['garantia', 'servicio_presencial', 'instalacion', 'servicio_remoto', 'instalacion_remota'];
  const servicios = tipos.map((tipo, indice) => ({ ...ejemplo, id: indice + 1, tipo, fecha_programada: '2026-10-07' }));
  const agrupados = agruparPresenciales(servicios);
  assert.deepEqual(agrupados['2026-10-07'].map((item) => item.tipo), tipos.slice(0, 3));
  assert.equal(agrupados['2026-10-08'], undefined);
  assert.deepEqual(agruparPresenciales(servicios.slice(3)), {});
  const calendario = construirCalendario({ anio: 2026, mes: 9 });
  assert.equal(calendario.celdas.find((celda) => celda?.fecha === '2026-10-07').dia, 7);
});

test('Día normal, un presencial ocupado y dos o más sobrecargados con conteo real', () => {
  assert.doesNotMatch(dia(0), /agenda-ocupada|agenda-sobrecarga|disponibilidad-conteo/);
  assert.match(dia(1), /agenda-ocupada/); assert.doesNotMatch(dia(1), /agenda-sobrecarga/);
  assert.match(dia(1), /disponibilidad-conteo[^>]*>1</);
  for (const cantidad of [2, 5]) {
    assert.match(dia(cantidad), /agenda-sobrecarga/);
    assert.match(dia(cantidad), new RegExp(`disponibilidad-conteo[^>]*>${cantidad}<`));
    assert.match(dia(cantidad), /sobrecarga/);
  }
});

test('Indisponibilidad manual conserva marca y etiqueta incluso con servicios o sobrecarga', () => {
  for (const cantidad of [0, 1, 3]) {
    const html = dia(cantidad, true);
    assert.match(html, /no-disponible/); assert.match(html, /no disponible/);
    assert.match(html, /disponibilidad-marca/);
    if (cantidad === 3) assert.match(html, /agenda-sobrecarga/);
  }
});

test('Detalle muestra todos los presenciales del día, estado, máquina y enlace al servicio', () => {
  const servicios = [{ ...ejemplo, tipo: 'instalacion', tipo_falla: null, fecha_programada: '2026-10-07' },
    { ...ejemplo, id: 10, tipo: 'garantia', cliente_nombre: 'Segundo cliente', fecha_programada: '2026-10-07' }];
  const html = render(DetalleDia, { fecha: '2026-10-07', servicios });
  for (const texto of ['7 de octubre de 2026', 'Instalación', 'Publicidad ABC', 'Plotter', 'Pendiente', 'Segundo cliente']) assert.ok(html.includes(texto));
  assert.match(html, /Este técnico tiene 2 servicios presenciales/);
  assert.match(html, /agenda-sobrecarga/);
  assert.match(html, /href="\/servicios\/9"/);
  assert.match(html, /href="\/servicios\/10"/);
  assert.doesNotMatch(render(DetalleDia, { fecha: '2026-10-07', servicios: servicios.slice(0, 1) }), /agenda-sobrecarga/);
});

// Ejecuta los hooks reales con estado y ciclo de efectos controlados, sin dependencia de DOM.
function probarHook(hook) {
  const valores = [], efectos = [], pendientes = [];
  return {
    render(...args) {
      let indiceEstado = 0, indiceEfecto = 0;
      const originales = { useState: React.useState, useRef: React.useRef, useEffect: React.useEffect };
      React.useState = (inicial) => {
        const indice = indiceEstado++;
        if (!(indice in valores)) valores[indice] = typeof inicial === 'function' ? inicial() : inicial;
        return [valores[indice], (nuevo) => { valores[indice] = typeof nuevo === 'function' ? nuevo(valores[indice]) : nuevo; }];
      };
      React.useRef = (inicial) => {
        const indice = indiceEstado++;
        return valores[indice] ??= { current: inicial };
      };
      React.useEffect = (accion, dependencias) => {
        const indice = indiceEfecto++;
        const anterior = efectos[indice];
        if (!anterior || dependencias.some((valor, i) => !Object.is(valor, anterior.dependencias[i]))) {
          pendientes.push(() => {
            anterior?.limpiar?.();
            efectos[indice] = { dependencias, limpiar: accion() };
          });
        }
      };
      try { return hook(...args); } finally { Object.assign(React, originales); }
    },
    efectos() { while (pendientes.length) pendientes.shift()(); },
    desmontar() { efectos.forEach((efecto) => efecto.limpiar?.()); },
  };
}
const resolver = () => new Promise((resolve) => setImmediate(resolve));

test('Consulta mes YYYY-MM y técnico por API, nunca escribe indisponibilidades', async () => {
  const anterior = global.fetch, llamadas = [];
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return Response.json({ status: 'ok', servicios: [ejemplo] });
  };
  try {
    const signal = new AbortController().signal;
    await consultarServiciosCalendario(2, '2026-10', signal);
    await consultarServiciosCalendario(3, '2026-11', signal);
    assert.deepEqual(llamadas.map((item) => item.url), ['/api/servicios?mes=2026-10&tecnico_id=2', '/api/servicios?mes=2026-11&tecnico_id=3']);
    assert.ok(llamadas.every((item) => !item.opciones.method && item.opciones.signal === signal));
  } finally { global.fetch = anterior; }
});

test('Cambiar mes aborta la consulta anterior y oculta respuestas antiguas', async () => {
  const anterior = global.fetch, llamadas = [];
  global.fetch = (url, opciones) => new Promise((completar) => llamadas.push({ url, opciones, completar }));
  const hook = probarHook(useServiciosCalendario);
  try {
    hook.render(2, '2026-10'); hook.efectos();
    assert.equal(hook.render(2, '2026-11').cargando, true); hook.efectos();
    assert.equal(llamadas[0].opciones.signal.aborted, true);
    assert.match(llamadas[1].url, /mes=2026-11/);
    llamadas[1].completar(Response.json({ status: 'ok', servicios: [{ ...ejemplo, fecha_programada: '2026-11-07' }] }));
    await resolver();
    assert.equal(hook.render(2, '2026-11').porDia['2026-11-07'].length, 1);
    llamadas[0].completar(Response.json({ status: 'ok', servicios: [ejemplo] }));
    await resolver();
    assert.equal(hook.render(2, '2026-11').porDia['2026-11-07'].length, 1);
    assert.equal(hook.render(2, '2026-11').porDia['2026-10-15'], undefined);
  } finally { hook.desmontar(); global.fetch = anterior; }
});

test('Ocupación y persistencia manual permanecen separadas y se recargan al remontar', async () => {
  const anterior = global.fetch, llamadas = [];
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    if (url.startsWith('/api/servicios')) return Response.json({ status: 'ok', servicios: [ejemplo] });
    if (opciones.method === 'POST') {
      const payload = JSON.parse(opciones.body);
      return Response.json({ status: 'ok', indisponibilidad: { id: 1, tecnico_id: 2, ...payload } });
    }
    return Response.json({ status: 'ok', indisponibilidades: [] });
  };
  const useCombinado = () => {
    const manual = useTecnicoDisponibilidad(2);
    return { manual, agenda: useServiciosCalendario(2, manual.calendario.desde.slice(0, 7)) };
  };
  let hook = probarHook(useCombinado);
  try {
    hook.render(); hook.efectos(); await resolver();
    let estado = hook.render();
    assert.deepEqual(estado.manual.lista, []);
    assert.ok(llamadas.every((item) => !item.opciones.method));
    estado.manual.seleccionar(estado.manual.calendario.desde);
    estado = hook.render();
    await estado.manual.guardar('Ausencia');
    estado = hook.render();
    assert.equal(estado.manual.lista.length, 1);
    const escritura = llamadas.find((item) => item.opciones.method === 'POST');
    assert.equal(escritura.url, '/api/tecnicos/2/disponibilidad');
    assert.deepEqual(JSON.parse(escritura.opciones.body), { fecha: estado.manual.calendario.desde, motivo: 'Ausencia' });
    hook.desmontar();
    hook = probarHook(useCombinado);
    hook.render(); hook.efectos(); await resolver();
    assert.equal(llamadas.filter((item) => item.url.startsWith('/api/servicios')).length, 2);
  } finally { hook.desmontar(); global.fetch = anterior; }
});
