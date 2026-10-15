const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo, tecnicos } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const Detalle = require('../src/components/servicios/DetalleServicio.tsx').default;
const { FichaServicio } = require('../src/components/servicios/DetalleServicio.tsx');
const Formulario = require('../src/components/servicios/FormularioServicio.tsx').default;
const api = require('../src/services/serviciosService.ts');
const ayudas = require('../src/components/servicios/formularioServicioAyudas.ts');

test('Formularios omiten campos retirados incluso con datos historicos', () => {
  const props = { tecnicos, cargandoTecnicos: false, errorTecnicos: '', cancelar() {}, alGuardar() {}, onOcupado() {} };
  const historico = { ...ejemplo, tarjeteria: 'Sunjung', cabezal: 'DX7', trabajo_realizado: 'REVISION' };
  for (const servicio of [undefined, historico]) {
    assert.doesNotMatch(render(Formulario, { ...props, servicio }), /Trabajo realizado|Tipo de trabajo|concepto|Tarjetería|Cabezal|trabajos-comunes/);
  }
  const valores = ayudas.valoresIniciales(historico);
  for (const campo of ['tarjeteria', 'cabezal', 'trabajo_realizado']) {
    assert.ok(!(campo in valores));
    assert.ok(!(campo in ayudas.construirPayload(valores)));
  }
  assert.deepEqual(ayudas.construirPayload(valores, historico), {});
});

test('Ficha permite cambiar estado sin campos retirados', () => {
  for (const tipo of ['servicio_presencial', 'servicio_remoto', 'instalacion', 'instalacion_remota', 'garantia']) {
    const html = render(FichaServicio, { servicio: { ...ejemplo, tipo }, coordinador: false, tecnico: 'Juan', ocupado: false,
      cerrar() {}, editar() {}, cambiarEstado() {} });
    assert.doesNotMatch(html, /Trabajo realizado|Tipo de trabajo|concepto|Tarjetería|Cabezal|trabajos-comunes/);
    assert.doesNotMatch(html, /name="cliente_nombre"|>Editar<|comprobante|Técnico asignado/);
  }
});

test('Detalle técnico completa enviando solo estado, sin campos administrativos', async () => {
  const anterior = global.fetch, llamadas = [], guardados = [];
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return Response.json({ status: 'ok', servicio: opciones.method === 'PATCH'
      ? { ...ejemplo, estado: 'realizado' } : ejemplo });
  };
  const componente = montar(Detalle, { id: ejemplo.id, coordinador: false, tecnicos: [], cerrar() {}, editar() {},
    alGuardar(servicio) { guardados.push(servicio); }, onOcupado() {} });
  try {
    componente.render(); componente.activar(); await terminar();
    const editada = encontrarTodos(componente.render(), elemento => elemento.type === FichaServicio)[0];
    editada.props.cambiarEstado('realizado'); editada.props.cambiarEstado('realizado');
    await terminar();
    assert.equal(llamadas.length, 2);
    assert.equal(llamadas[1].url, `/api/servicios/${ejemplo.id}/estado`);
    assert.deepEqual(JSON.parse(llamadas[1].opciones.body), { estado: 'realizado' });
    assert.equal(guardados[0].estado, 'realizado');
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('Error de acceso al finalizar se conserva', async () => {
  const anterior = global.fetch;
  global.fetch = async () => Response.json({ status: 'error', message: 'Servicio no accesible' }, { status: 403 });
  try { await assert.rejects(api.cambiarEstadoServicio(9, 'realizado'), /Servicio no accesible/); }
  finally { global.fetch = anterior; }
});
