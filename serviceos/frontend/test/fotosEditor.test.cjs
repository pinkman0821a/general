const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { render, ejemplo, tecnicos } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const { fotos, archivo, urlsPrueba } = require('./fotosAyudas.cjs');
const { crearBorradorFotos } = require('../src/components/servicios/fotos/borradorFotos.ts');
const { useFotosEdicion } = require('../src/components/servicios/fotos/useFotosEdicion.ts');
const Formulario = require('../src/components/servicios/FormularioServicio.tsx').default;
const Editor = require('../src/components/servicios/fotos/EditorFotos.tsx').default;
const FotoMiniatura = require('../src/components/servicios/fotos/FotoMiniatura.tsx').default;
const api = require('../src/services/servicioFotosService.ts');

test('Previews permiten 1/5, selección acumulativa, bloquean sexta y revocan al quitar/destruir', () => {
  const urls = urlsPrueba(), borrador = crearBorradorFotos();
  try {
    borrador.agregar([archivo('primera.jpg')]); assert.equal(borrador.leer().nuevas.length, 1);
    borrador.agregar(Array.from({ length: 4 }, (_, i) => archivo(`otra${i}.jpg`)));
    assert.equal(borrador.leer().nuevas.length, 5);
    assert.throws(() => borrador.agregar([archivo()]), /máximo 5/);
    assert.equal(urls.creadas.length, 5);
    const primera = borrador.leer().nuevas[0]; borrador.quitar(primera.id);
    assert.deepEqual(urls.revocadas, [primera.url]);
    borrador.liberar(); assert.equal(urls.revocadas.length, 5); assert.equal(borrador.leer().nuevas.length, 0);
  } finally { borrador.liberar(); urls.restaurar(); }
});

test('Existentes + nuevas máximo cinco; eliminación es local y restaurar tampoco excede límite', () => {
  const urls = urlsPrueba(), borrador = crearBorradorFotos();
  try {
    const existentes = Array.from({ length: 4 }, (_, i) => ({ ...fotos[0], id: i + 1 }));
    borrador.cargar(existentes); borrador.agregar([archivo()]);
    assert.throws(() => borrador.agregar([archivo()]), /máximo 5/);
    borrador.marcar(1); borrador.marcar(2); borrador.agregar([archivo(), archivo()]);
    assert.equal(borrador.leer().nuevas.length, 3);
    assert.throws(() => borrador.marcar(1), /máximo 5/);
    assert.deepEqual(borrador.leer().existentes, existentes);
    assert.deepEqual(borrador.solicitud().eliminar, [1, 2]);
  } finally { borrador.liberar(); urls.restaurar(); }
});

test('Campo opcional aparece en cinco tipos, múltiple, MIME y preview con X táctil', () => {
  for (const tipo of ['garantia', 'servicio_presencial', 'servicio_remoto', 'instalacion', 'instalacion_remota']) {
    const html = render(Formulario, { servicio: { ...ejemplo, tipo }, tecnicos, cargandoTecnicos: false, errorTecnicos: '', alGuardar() {}, cancelar() {}, onOcupado() {} });
    assert.match(html, /Fotos del servicio/); assert.match(html, /Opcional · máximo 5 fotos · 5 MB por foto/);
  }
  const borrador = crearBorradorFotos(), urls = urlsPrueba();
  try {
    const datos = borrador.agregar([archivo()]);
    let elegidas;
    const props = { fotos: { datos, cargando: false, error: '', agregar: archivos => { elegidas = archivos; }, quitar() {}, marcar() {}, reintentar() {} }, bloqueado: false };
    const html = render(Editor, props);
    assert.match(html, /type="file" multiple="" accept="image\/jpeg,image\/png,image\/webp"/);
    assert.match(html, /1 de 5/); assert.match(html, /Vista previa foto.jpg/); assert.match(html, /Quitar foto foto.jpg/);
    const componente = montar(Editor, props);
    try {
      const input = encontrarTodos(componente.render(), nodo => nodo.type === 'input')[0];
      input.props.onChange({ target: { files: [archivo(), archivo()], value: 'selección' } });
      assert.equal(elegidas.length, 2);
    } finally { componente.desmontar(); }
  } finally { borrador.liberar(); urls.restaurar(); }
});

test('Edición muestra fotos existentes, marca eliminación local y cancelar no hace POST/DELETE', async () => {
  const anterior = global.fetch, llamadas = [], urls = urlsPrueba();
  global.fetch = async (url, opciones) => { llamadas.push({ url, opciones }); return Response.json({ status: 'ok', fotos }); };
  const componente = montar(useFotosEdicion, 9);
  try {
    componente.render(); componente.activar(); await terminar();
    let estado = componente.render(); assert.deepEqual(estado.datos.existentes, fotos);
    const props = { fotos: estado, servicioId: 9, bloqueado: false };
    const editor = montar(Editor, props);
    try { assert.equal(encontrarTodos(editor.render(), nodo => nodo.type === FotoMiniatura).length, 1); } finally { editor.desmontar(); }
    estado.marcar(1); estado.agregar([archivo()]); estado = componente.render();
    assert.deepEqual(estado.datos.eliminar, [1]);
    componente.desmontar(); assert.equal(urls.revocadas.length, 1);
    assert.equal(llamadas.length, 1); assert.equal(llamadas[0].opciones.method, undefined);
  } finally { componente.desmontar(); urls.restaurar(); global.fetch = anterior; }
});

test('Validación de foto no permite vacío, tamaño excesivo o MIME distinto y API sube lote multipart estable', async () => {
  assert.throws(() => api.validarFoto(new Blob([], { type: 'image/jpeg' })), /vacía/);
  assert.throws(() => api.validarFoto(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/jpeg' })), /5 MB/);
  assert.throws(() => api.validarFoto(new Blob(['pdf'], { type: 'application/pdf' })), /JPEG/);
  const anterior = global.fetch; let llamada;
  global.fetch = async (url, opciones) => { llamada = { url, opciones }; return Response.json({ status: 'ok', fotos }); };
  try {
    await api.guardarFotos(9, [archivo(), archivo()], [1], 'lote-seguro-123456');
    assert.equal(llamada.url, '/api/servicios/9/fotos'); assert.equal(llamada.opciones.method, 'POST');
    assert.equal(llamada.opciones.credentials, 'include'); assert.equal(llamada.opciones.headers['Idempotency-Key'], 'lote-seguro-123456');
    assert.equal(llamada.opciones.body.getAll('archivos').length, 2); assert.equal(llamada.opciones.body.get('eliminar'), '[1]');
  } finally { global.fetch = anterior; }
});

test('Mobile usa dos/tres columnas, X de 44px y visor adaptable sin scroll horizontal', () => {
  const css = fs.readFileSync(require.resolve('../src/styles/servicioFotos.css'), 'utf8');
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/); assert.match(css, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.foto-quitar[^}]*min-height: 44px/); assert.match(css, /94vw/);
  assert.doesNotMatch(css, /overflow-x: (scroll|auto)/);
});
