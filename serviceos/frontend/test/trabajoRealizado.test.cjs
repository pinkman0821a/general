const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo, tecnicos } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const Detalle = require('../src/components/servicios/DetalleServicio.tsx').default;
const { FichaServicio } = require('../src/components/servicios/DetalleServicio.tsx');
const Trabajo = require('../src/components/servicios/TrabajoRealizado.tsx').default;
const Formulario = require('../src/components/servicios/FormularioServicio.tsx').default;
const api = require('../src/services/serviciosService.ts');
const ayudas = require('../src/components/servicios/formularioServicioAyudas.ts');

test('Concepto flexible con sugerencias, edición coordinador sin complicar creación', () => {
  const html = render(Trabajo, { valor: 'LIMPIEZA ESPECIAL', ocupado: false, cambiar() {} });
  assert.match(html, /<input[^>]*list="trabajos-comunes"[^>]*value="LIMPIEZA ESPECIAL"/);
  assert.match(html, /MANTENIMIENTO|PERFILACION|INSTALACION PROGRAMA/);
  assert.match(html, /Puedes escribir otro trabajo/);
  const props = { tecnicos, cargandoTecnicos: false, errorTecnicos: '', cancelar() {}, alGuardar() {}, onOcupado() {} };
  assert.doesNotMatch(render(Formulario, props), /Trabajo realizado/);
  assert.match(render(Formulario, { ...props, servicio: ejemplo }), /Trabajo realizado/);
  const valores = ayudas.valoresIniciales(ejemplo);
  valores.trabajo_realizado = 'LIMPIEZA ESPECIAL';
  assert.deepEqual(ayudas.construirPayload(valores, ejemplo), { trabajo_realizado: 'LIMPIEZA ESPECIAL' });
});

test('Ficha técnico solo habilita concepto en servicios y no muestra edición administrativa', () => {
  for (const tipo of ['servicio_presencial', 'servicio_remoto', 'instalacion', 'instalacion_remota', 'garantia']) {
    const html = render(FichaServicio, { servicio: { ...ejemplo, tipo }, coordinador: false, tecnico: 'Juan', ocupado: false,
      cerrar() {}, editar() {}, cambiarEstado() {}, trabajo: '', cambiarTrabajo() {}, guardarTrabajo() {} });
    assert.equal(html.includes('Trabajo realizado'), tipo.startsWith('servicio_'));
    assert.doesNotMatch(html, /name="cliente_nombre"|>Editar<|comprobante|Técnico asignado/);
  }
});

test('Detalle técnico completa enviando solo estado y concepto, sin campos administrativos', async () => {
  const anterior = global.fetch, llamadas = [], guardados = [];
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return Response.json({ status: 'ok', servicio: opciones.method === 'PATCH'
      ? { ...ejemplo, estado: 'realizado', trabajo_realizado: 'CALIBRACION' } : ejemplo });
  };
  const componente = montar(Detalle, { id: ejemplo.id, coordinador: false, tecnicos: [], cerrar() {}, editar() {},
    alGuardar(servicio) { guardados.push(servicio); }, onOcupado() {} });
  try {
    componente.render(); componente.activar(); await terminar();
    const ficha = encontrarTodos(componente.render(), elemento => elemento.type === FichaServicio)[0];
    ficha.props.cambiarTrabajo('CALIBRACION');
    const editada = encontrarTodos(componente.render(), elemento => elemento.type === FichaServicio)[0];
    editada.props.cambiarEstado('realizado'); editada.props.cambiarEstado('realizado');
    await terminar();
    assert.equal(llamadas.length, 2);
    assert.equal(llamadas[1].url, `/api/servicios/${ejemplo.id}/estado`);
    assert.deepEqual(JSON.parse(llamadas[1].opciones.body), { estado: 'realizado', trabajo_realizado: 'CALIBRACION' });
    assert.equal(guardados[0].trabajo_realizado, 'CALIBRACION');
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('Error de negocio al finalizar sin trabajo se conserva para el técnico', async () => {
  const anterior = global.fetch;
  global.fetch = async () => Response.json({ status: 'error', message: 'Indica el trabajo realizado antes de completar el servicio.' }, { status: 400 });
  try { await assert.rejects(api.cambiarEstadoServicio(9, 'realizado', ''), /Indica el trabajo realizado/); }
  finally { global.fetch = anterior; }
});
