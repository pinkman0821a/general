const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo } = require('./serviciosTestAyudas.cjs');
const api = require('../src/services/serviciosService.ts');
const { crearOperacionServicio } = require('../src/components/servicios/operacionServicio.ts');
const Alerta = require('../src/components/servicios/AlertaSobrecarga.tsx').default;

async function conFetch(responder, verificar) {
  const anterior = global.fetch;
  const llamadas = [];
  global.fetch = async (url, opciones) => {
    const llamada = { url, ...opciones, payload: opciones.body ? JSON.parse(opciones.body) : undefined };
    llamadas.push(llamada);
    return responder(llamada, llamadas.length);
  };
  try { await verificar(llamadas); } finally { global.fetch = anterior; }
}
const ok = () => Response.json({ status: 'ok', servicio: ejemplo, servicios: [ejemplo] });
const sobrecarga = () => Response.json({ status: 'error', codigo: 'sobrecarga_agenda',
  presenciales_existentes: 3, presenciales_resultantes: 4 }, { status: 409 });
const contexto = { tecnico: 'Juan', fecha: '2026-10-15' };

test('Filtros combinados llegan a API con mes YYYY-MM, aborto y credenciales', async () => {
  await conFetch(ok, async (llamadas) => {
    const signal = new AbortController().signal;
    await api.listarServicios({ mes: '2026-10', estado: 'pendiente', tipo: 'garantia', tecnico_id: '2', buscar: ' ABC ' }, signal);
    const url = new URL(llamadas[0].url, 'https://serviceos.test');
    assert.deepEqual(Object.fromEntries(url.searchParams), { mes: '2026-10', estado: 'pendiente', tipo: 'garantia', tecnico_id: '2', buscar: 'ABC' });
    assert.equal(llamadas[0].signal, signal); assert.equal(llamadas[0].credentials, 'include');
    await api.listarServicios({ mes: '2026-09', estado: '', tipo: '', tecnico_id: '', buscar: ' ' });
    assert.equal(llamadas[1].url, '/api/servicios?mes=2026-09');
  });
});

test('POST, PATCH parcial, detalle y cambio de estado usan endpoints específicos', async () => {
  await conFetch(ok, async (llamadas) => {
    await api.crearServicio({ cliente_nombre: 'ABC' });
    await api.editarServicio(9, { observaciones: 'Revisar' });
    await api.obtenerServicio(9);
    await api.cambiarEstadoServicio(9, 'en_proceso');
    assert.deepEqual(llamadas.map((item) => [item.url, item.method]), [
      ['/api/servicios', 'POST'], ['/api/servicios/9', 'PATCH'], ['/api/servicios/9', undefined], ['/api/servicios/9/estado', 'PATCH'],
    ]);
    assert.deepEqual(llamadas[1].payload, { observaciones: 'Revisar' });
    assert.deepEqual(llamadas[3].payload, { estado: 'en_proceso' });
    assert.ok(llamadas.every((item) => item.credentials === 'include'));
  });
});

for (const id of [undefined, 9]) {
  test(`409 abre advertencia y confirmar repite exactamente ${id ? 'PATCH' : 'POST'} con bandera`, async () => {
    await conFetch((_llamada, numero) => numero === 1 ? sobrecarga() : ok(), async (llamadas) => {
      let estado; let guardados = 0;
      const operacion = crearOperacionServicio((nuevo) => { estado = nuevo; }, () => { guardados++; });
      const payload = { tipo: 'garantia', cliente_nombre: 'ABC', tecnico_id: 2, fecha_programada: contexto.fecha };
      await operacion.guardar(id, payload, contexto);
      assert.equal(guardados, 0);
      assert.deepEqual(estado.advertencia, { ...contexto, existentes: 3, resultantes: 4 });
      assert.equal(estado.error, '');
      const html = render(Alerta, { advertencia: estado.advertencia, guardando: false, confirmar() {}, cancelar() {} });
      assert.match(html, /agenda-sobrecarga/); assert.match(html, /Advertencia de agenda/);
      assert.match(html, /<strong>3<\/strong>/); assert.match(html, /<strong>4<\/strong>/);
      assert.match(html, /Juan/); assert.match(html, /15 de octubre de 2026/);
      payload.cliente_nombre = 'CAMBIO POSTERIOR';
      await operacion.guardar(id, payload, contexto);
      assert.equal(llamadas.length, 1);
      await operacion.confirmar();
      assert.equal(llamadas.length, 2); assert.equal(guardados, 1);
      assert.equal(llamadas[1].url, llamadas[0].url);
      assert.equal(llamadas[1].method, llamadas[0].method);
      assert.deepEqual(llamadas[1].payload, { ...llamadas[0].payload, confirmar_sobrecarga: true });
      assert.equal(estado.advertencia, null); assert.equal(estado.guardando, false);
    });
  });
}

test('Cancelar advertencia no reintenta ni guarda', async () => {
  await conFetch(sobrecarga, async (llamadas) => {
    let estado; let guardados = 0;
    const operacion = crearOperacionServicio((nuevo) => { estado = nuevo; }, () => { guardados++; });
    await operacion.guardar(undefined, { tipo: 'garantia' }, contexto);
    operacion.cancelar(); await operacion.confirmar();
    assert.equal(llamadas.length, 1); assert.equal(guardados, 0); assert.equal(estado.advertencia, null);
  });
});

test('Confirmación fallida muestra el nuevo error del servidor', async () => {
  await conFetch((_llamada, numero) => numero === 1 ? sobrecarga()
    : Response.json({ status: 'error', message: 'Técnico no disponible ese día' }, { status: 409 }), async () => {
    let estado;
    const operacion = crearOperacionServicio((nuevo) => { estado = nuevo; }, () => assert.fail('No debe guardar'));
    await operacion.guardar(9, { tecnico_id: 2 }, contexto);
    await operacion.confirmar();
    assert.equal(estado.error, 'Técnico no disponible ese día');
    assert.equal(estado.advertencia, null); assert.equal(estado.guardando, false);
  });
});

test('Bloquea doble POST, PATCH y cambio de estado mientras espera', async () => {
  for (const tipo of ['POST', 'PATCH', 'estado']) {
    let resolver;
    await conFetch(() => new Promise((resolve) => { resolver = resolve; }), async (llamadas) => {
      const operacion = crearOperacionServicio(() => {}, () => {});
      const ejecutar = () => tipo === 'estado' ? operacion.ejecutar(() => api.cambiarEstadoServicio(9, 'realizado'))
        : operacion.guardar(tipo === 'POST' ? undefined : 9, { observaciones: 'A' }, contexto);
      const primera = ejecutar();
      await ejecutar(); assert.equal(llamadas.length, 1);
      resolver(ok()); await primera;
    });
  }
});

test('Errores legibles conservan mensaje backend, sesión expirada y fallo de red', async () => {
  for (const [codigo, mensaje] of [[400, 'La asignación requiere un técnico activo'], [404, 'Servicio no encontrado'],
    [400, 'Fecha programada inválida'], [400, 'Valor del servicio debe ser entero positivo en COP']]) {
    await conFetch(() => Response.json({ status: 'error', message: mensaje }, { status: codigo }), async () => {
      await assert.rejects(api.obtenerServicio(9), { message: mensaje });
    });
  }
  await conFetch(() => Response.json({ message: 'No autenticado' }, { status: 401 }), async () => {
    await assert.rejects(api.obtenerServicio(9), /sesión expiró/);
  });
  await conFetch(() => { throw new TypeError('Failed to fetch'); }, async () => {
    await assert.rejects(api.obtenerServicio(9), /Revisa tu conexión/);
  });
});
