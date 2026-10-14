const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ejemplo, tecnicos } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const { fotos, archivo, urlsPrueba } = require('./fotosAyudas.cjs');
const Formulario = require('../src/components/servicios/FormularioServicio.tsx').default;
const Editor = require('../src/components/servicios/fotos/EditorFotos.tsx').default;

function prepararFormulario(props = {}) {
  const guardados = [], ocupaciones = [];
  const componente = montar(Formulario, { tecnicos, cargandoTecnicos: false, errorTecnicos: '', cancelar() {},
    alGuardar(servicio, aviso) { guardados.push({ servicio, aviso }); }, onOcupado(valor) { ocupaciones.push(valor); }, ...props });
  let arbol = componente.render(); componente.activar();
  if (!props.servicio) {
    for (const campo of ['cliente_nombre', 'cliente_telefono', 'fecha_programada', 'maquina', 'tipo_falla', 'ciudad', 'direccion', 'valor_servicio', 'tecnico_id']) {
      const entrada = encontrarTodos(arbol, nodo => nodo.props?.name === campo)[0];
      entrada.props.onChange({ target: { value: String(ejemplo[campo]) } });
    }
    arbol = componente.render(); componente.activar();
  }
  return { componente, guardados, ocupaciones };
}
function enviar(componente) {
  const arbol = componente.render(); componente.activar();
  return encontrarTodos(arbol, nodo => nodo.type === 'form')[0].props.onSubmit({ preventDefault() {} });
}

for (const cantidad of [0, 1, 5]) test(`Guardar servicio con ${cantidad} fotos usa una operación visual y libera previews`, async () => {
  const anterior = global.fetch, urls = urlsPrueba(), llamadas = [];
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return Response.json(url.endsWith('/fotos') ? { status: 'ok', fotos } : { status: 'ok', servicio: ejemplo });
  };
  const { componente, guardados } = prepararFormulario();
  try {
    if (cantidad) encontrarTodos(componente.render(), nodo => nodo.type === Editor)[0].props.fotos.agregar(Array.from({ length: cantidad }, () => archivo()));
    await enviar(componente);
    assert.equal(guardados.length, 1); assert.equal(llamadas.length, cantidad ? 2 : 1);
    assert.equal(llamadas[0].url, '/api/servicios');
    if (cantidad) { assert.equal(llamadas[1].url, '/api/servicios/9/fotos'); assert.equal(llamadas[1].opciones.body.getAll('archivos').length, cantidad); }
    assert.equal(urls.revocadas.length, cantidad);
  } finally { componente.desmontar(); urls.restaurar(); global.fetch = anterior; }
});

test('Guardando abarca subida completa, no cierra antes y bloquea doble envío inmediato', async () => {
  const anterior = global.fetch, urls = urlsPrueba(), llamadas = []; let terminarFotos;
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return url.endsWith('/fotos') ? new Promise(resolve => { terminarFotos = resolve; }) : Response.json({ status: 'ok', servicio: ejemplo });
  };
  const { componente, guardados, ocupaciones } = prepararFormulario();
  try {
    encontrarTodos(componente.render(), nodo => nodo.type === Editor)[0].props.fotos.agregar([archivo()]);
    const primera = enviar(componente); await terminar();
    assert.equal(guardados.length, 0); assert.equal(ocupaciones.at(-1), true);
    const submit = encontrarTodos(componente.render(), nodo => nodo.type === 'button' && nodo.props.type === 'submit')[0];
    assert.equal(submit.props.children, 'Guardando…'); assert.equal(submit.props.disabled, true);
    await enviar(componente); assert.equal(llamadas.length, 2);
    terminarFotos(Response.json({ status: 'ok', fotos })); await primera;
    assert.equal(guardados.length, 1); assert.equal(ocupaciones.at(-1), false);
  } finally { componente.desmontar(); urls.restaurar(); global.fetch = anterior; }
});

test('Fallo foto informa servicio creado y retry reutiliza ID/lote, sin segundo POST servicio', async () => {
  const anterior = global.fetch, urls = urlsPrueba(), llamadas = []; let intentos = 0;
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    if (!url.endsWith('/fotos')) return Response.json({ status: 'ok', servicio: ejemplo });
    return ++intentos === 1 ? Response.json({ message: 'R2 temporalmente no disponible' }, { status: 500 }) : Response.json({ status: 'ok', fotos });
  };
  const { componente, guardados } = prepararFormulario();
  try {
    encontrarTodos(componente.render(), nodo => nodo.type === Editor)[0].props.fotos.agregar([archivo()]);
    await enviar(componente);
    const alerta = encontrarTodos(componente.render(), nodo => nodo.props?.role === 'alert')[0];
    assert.match(alerta.props.children, /servicio #9 ya quedó guardado/); assert.match(alerta.props.children, /sin duplicarlo/);
    assert.equal(guardados.length, 0);
    await enviar(componente); assert.equal(guardados.length, 1);
    assert.deepEqual(llamadas.map(l => l.url), ['/api/servicios', '/api/servicios/9/fotos', '/api/servicios/9/fotos']);
    assert.equal(llamadas[1].opciones.headers['Idempotency-Key'], llamadas[2].opciones.headers['Idempotency-Key']);
  } finally { componente.desmontar(); urls.restaurar(); global.fetch = anterior; }
});

test('Solo cambios de fotos se guardan sin PATCH vacío, existentes retiradas al confirmar y aviso visible al padre', async () => {
  const anterior = global.fetch, urls = urlsPrueba(), llamadas = [];
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return Response.json({ status: 'ok', fotos: opciones.method === 'POST' ? [] : fotos,
      ...(opciones.method === 'POST' ? { aviso: 'Limpieza pendiente' } : {}) });
  };
  const { componente, guardados } = prepararFormulario({ servicio: ejemplo });
  try {
    await terminar();
    encontrarTodos(componente.render(), nodo => nodo.type === Editor)[0].props.fotos.marcar(1);
    await enviar(componente);
    assert.equal(llamadas.length, 2); assert.equal(llamadas[1].opciones.method, 'POST');
    assert.equal(llamadas[1].opciones.body.get('eliminar'), '[1]');
    assert.equal(guardados[0].aviso, 'Limpieza pendiente');
  } finally { componente.desmontar(); urls.restaurar(); global.fetch = anterior; }
});

test('Cancelar antes de guardar libera inmediatamente previews sin escrituras', () => {
  const urls = urlsPrueba(); let cancelados = 0;
  const { componente } = prepararFormulario({ cancelar() { cancelados++; } });
  try {
    encontrarTodos(componente.render(), nodo => nodo.type === Editor)[0].props.fotos.agregar([archivo()]);
    encontrarTodos(componente.render(), nodo => nodo.type === 'button' && nodo.props.children === 'Cancelar')[0].props.onClick();
    assert.equal(cancelados, 1); assert.equal(urls.revocadas.length, 1);
  } finally { componente.desmontar(); urls.restaurar(); }
});
