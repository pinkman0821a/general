const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo, tecnicos } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const { fotos, archivo, urlsPrueba } = require('./fotosAyudas.cjs');
const Galeria = require('../src/components/servicios/fotos/FotosServicio.tsx').default;
const Miniatura = require('../src/components/servicios/fotos/FotoMiniatura.tsx').default;
const Visor = require('../src/components/servicios/fotos/VisorFoto.tsx').default;
const Detalle = require('../src/components/servicios/DetalleServicio.tsx').default;
const Comprobante = require('../src/components/servicios/ComprobantePago.tsx').default;

test('Técnico ve galería de su servicio sin controles de edición ni comprobante', async () => {
  const anterior = global.fetch;
  global.fetch = async url => Response.json(url.endsWith('/fotos') ? { status: 'ok', fotos } : { status: 'ok', servicio: ejemplo });
  const detalle = montar(Detalle, { id: 9, coordinador: false, tecnicos, cerrar() {}, editar() {}, alGuardar() {}, onOcupado() {} });
  const galeria = montar(Galeria, { servicioId: 9 });
  try {
    detalle.render(); detalle.activar(); await terminar();
    const arbol = detalle.render();
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === Galeria).length, 1);
    assert.equal(render(Comprobante, { servicio: ejemplo, coordinador: false, ocupado: false }), '');
    galeria.render(); galeria.activar(); await terminar();
    const vista = galeria.render();
    assert.equal(encontrarTodos(vista, nodo => nodo.type === Miniatura).length, 1);
    assert.equal(encontrarTodos(vista, nodo => nodo.type === 'input' || nodo.props?.children === 'Eliminar').length, 0);
    encontrarTodos(vista, nodo => nodo.type === Miniatura)[0].props.abrir();
    const visor = encontrarTodos(galeria.render(), nodo => nodo.type === Visor)[0];
    assert.equal(visor.props.foto.id, 1); assert.equal(visor.props.servicioId, 9);
  } finally { detalle.desmontar(); galeria.desmontar(); global.fetch = anterior; }
});

test('Miniatura hace fetch autenticado, muestra blob privado y revoca al desmontar', async () => {
  const anterior = global.fetch, urls = urlsPrueba(), llamadas = []; let abiertas = 0;
  global.fetch = async (url, opciones) => { llamadas.push({ url, opciones }); return new Response(archivo(), { headers: { 'Content-Type': 'image/jpeg' } }); };
  const miniatura = montar(Miniatura, { servicioId: 9, foto: fotos[0], abrir() { abiertas++; } });
  try {
    miniatura.render(); miniatura.activar();
    for (let intento = 0; intento < 20 && !urls.creadas.length; intento++) await terminar();
    const arbol = miniatura.render();
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === 'img')[0].props.src, 'blob:foto-0');
    assert.equal(llamadas[0].url, '/api/servicios/9/fotos/1'); assert.equal(llamadas[0].opciones.credentials, 'include');
    arbol.props.onClick(); assert.equal(abiertas, 1);
    miniatura.desmontar(); assert.deepEqual(urls.revocadas, ['blob:foto-0']);
  } finally { urls.restaurar(); global.fetch = anterior; }
});

test('Visor descarga autenticado, cierra con botón/Escape y libera URL y foco', async () => {
  const anteriores = { fetch: global.fetch, document: global.document, HTMLElement: global.HTMLElement };
  const urls = urlsPrueba(); let cierres = 0, foco = 0, aperturas = 0, dialogosCerrados = 0;
  class Elemento { isConnected = true; focus() { foco++; } }
  global.HTMLElement = Elemento; global.document = { activeElement: new Elemento() };
  global.fetch = async () => new Response(archivo(), { headers: { 'Content-Type': 'image/jpeg' } });
  const visor = montar(Visor, { servicioId: 9, foto: fotos[0], cerrar() { cierres++; } });
  try {
    let arbol = visor.render();
    arbol.props.ref.current = { showModal() { aperturas++; }, close() { dialogosCerrados++; } };
    visor.activar();
    for (let intento = 0; intento < 20 && !urls.creadas.length; intento++) await terminar();
    arbol = visor.render();
    assert.equal(aperturas, 1); assert.equal(encontrarTodos(arbol, nodo => nodo.type === 'img')[0].props.src, 'blob:foto-0');
    encontrarTodos(arbol, nodo => nodo.type === 'button')[0].props.onClick();
    let prevenido = false; arbol.props.onCancel({ preventDefault() { prevenido = true; } });
    assert.equal(prevenido, true); assert.equal(cierres, 2);
    visor.desmontar(); assert.deepEqual(urls.revocadas, ['blob:foto-0']); assert.equal(foco, 1); assert.equal(dialogosCerrados, 1);
  } finally { urls.restaurar(); global.fetch = anteriores.fetch; global.document = anteriores.document; global.HTMLElement = anteriores.HTMLElement; }
});

test('Galería vacía y permiso denegado se muestran sin URL pública ni controles', async () => {
  const anterior = global.fetch;
  for (const fallo of [false, true]) {
    global.fetch = async () => Response.json(fallo ? { message: 'Servicio ajeno' } : { status: 'ok', fotos: [] }, { status: fallo ? 403 : 200 });
    const galeria = montar(Galeria, { servicioId: 9 });
    try {
      galeria.render(); galeria.activar(); await terminar();
      const html = require('react-dom/server').renderToStaticMarkup(galeria.render());
      assert.match(html, fallo ? /Servicio ajeno/ : /Sin fotos del servicio/);
      assert.doesNotMatch(html, /r2_key|https:\/\/|type="file"/);
    } finally { galeria.desmontar(); }
  }
  global.fetch = anterior;
});
