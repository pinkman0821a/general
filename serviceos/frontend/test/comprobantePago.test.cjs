const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo } = require('./serviciosTestAyudas.cjs');
const Bloque = require('../src/components/servicios/ComprobantePago.tsx').default;
const Visor = require('../src/components/servicios/VisorComprobante.tsx').default;
const api = require('../src/services/comprobanteService.ts');

const props = { servicio: ejemplo, coordinador: true, ocupado: false, alGuardar() {}, onOcupado() {} };
for (const tipo of ['garantia', 'instalacion', 'instalacion_remota', 'servicio_presencial', 'servicio_remoto']) {
  test(`Bloque administrativo por rol y tipo ${tipo}`, () => {
    const servicio = { ...ejemplo, tipo, comprobante_key: 'KEY_SECRETA' };
    const html = render(Bloque, { ...props, servicio });
    assert.equal(html.includes('Comprobante de pago'), tipo.startsWith('servicio_'));
    assert.doesNotMatch(html, /KEY_SECRETA|comprobante_key/);
    assert.equal(render(Bloque, { ...props, servicio, coordinador: false }), '');
  });
}

test('Sin comprobante ofrece upload; con comprobante ofrece ver/reemplazar/eliminar sin key', () => {
  const vacio = render(Bloque, props);
  assert.match(vacio, /Sin comprobante|Subir comprobante/);
  assert.match(vacio, /accept="image\/jpeg,image\/png,image\/webp"/);
  const cargado = render(Bloque, { ...props, servicio: { ...ejemplo, tiene_comprobante: true, comprobante_nombre: 'pago.png', comprobante_size: 2048 } });
  for (const texto of ['Comprobante cargado', 'Ver comprobante', 'Reemplazar', 'Eliminar', 'pago.png', '2 KB']) assert.ok(cargado.includes(texto));
});

test('Validación local rechaza vacío, MIME inválido y >5MB', () => {
  assert.throws(() => api.validarArchivoComprobante(new Blob([], { type: 'image/jpeg' })), /vacío/);
  assert.throws(() => api.validarArchivoComprobante(new Blob(['PDF'], { type: 'application/pdf' })), /JPEG, PNG o WebP/);
  assert.throws(() => api.validarArchivoComprobante(new Blob([new Uint8Array(5242881)], { type: 'image/png' })), /5 MB/);
  for (const tipo of api.formatosComprobante) assert.doesNotThrow(() => api.validarArchivoComprobante(new Blob(['imagen'], { type: tipo })));
});

test('Subir y reemplazar usan el mismo PUT multipart autenticado, sin URL/key pública', async () => {
  const anterior = global.fetch, llamadas = [];
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return Response.json({ status: 'ok', servicio: { ...ejemplo, tiene_comprobante: true } });
  };
  try {
    await api.subirComprobante(9, new File(['JPG'], 'pago.jpg', { type: 'image/jpeg' }));
    await api.subirComprobante(9, new File(['PNG'], 'nuevo.png', { type: 'image/png' }));
    assert.ok(llamadas.every(({ url, opciones }) => url === '/api/servicios/9/comprobante'
      && opciones.method === 'PUT' && opciones.credentials === 'include' && opciones.body instanceof FormData && !opciones.headers));
    assert.equal(llamadas[0].opciones.body.get('archivo').name, 'pago.jpg');
    assert.equal(llamadas[1].opciones.body.get('archivo').name, 'nuevo.png');
  } finally { global.fetch = anterior; }
});

test('Eliminar usa DELETE autenticado y conserva el aviso de limpieza del servidor', async () => {
  const anterior = global.fetch;
  global.fetch = async (url, opciones) => {
    assert.equal(url, '/api/servicios/9/comprobante'); assert.equal(opciones.method, 'DELETE'); assert.equal(opciones.credentials, 'include');
    return Response.json({ status: 'ok', servicio: { ...ejemplo, tiene_comprobante: false }, aviso: 'Limpieza pendiente' });
  };
  try { assert.equal((await api.eliminarComprobante(9)).aviso, 'Limpieza pendiente'); }
  finally { global.fetch = anterior; }
});

test('Visor obtiene Blob autenticado y revoca URL al cerrar, reemplazar y desmontar', async () => {
  const anterior = global.fetch, crear = URL.createObjectURL, revocar = URL.revokeObjectURL;
  const revocadas = []; let mostrada; let contador = 0;
  global.fetch = async (url, opciones) => {
    assert.equal(url, '/api/servicios/9/comprobante'); assert.equal(opciones.credentials, 'include');
    return new Response(new Blob(['imagen'], { type: 'image/png' }));
  };
  URL.createObjectURL = (blob) => { assert.ok(blob instanceof Blob); return `blob:temporal-${++contador}`; };
  URL.revokeObjectURL = (url) => revocadas.push(url);
  try {
    const visor = api.crearVisorComprobante((url) => { mostrada = url; });
    const blob = await api.obtenerComprobante(9);
    visor.abrir(blob);
    const html = render(Visor, { url: mostrada, cerrar: visor.cerrar });
    assert.match(html, /src="blob:temporal-1"/); assert.match(html, /Cerrar comprobante/);
    visor.cerrar(); assert.equal(mostrada, null); assert.deepEqual(revocadas, ['blob:temporal-1']);
    visor.abrir(blob); visor.abrir(blob); visor.destruir();
    assert.deepEqual(revocadas, ['blob:temporal-1', 'blob:temporal-2', 'blob:temporal-3']);
  } finally { global.fetch = anterior; URL.createObjectURL = crear; URL.revokeObjectURL = revocar; }
});

test('Mensajes de servidor, sesión y red se presentan legibles', async () => {
  const anterior = global.fetch;
  try {
    global.fetch = async () => Response.json({ message: 'Este tipo no admite comprobante' }, { status: 400 });
    await assert.rejects(api.eliminarComprobante(9), /Este tipo no admite comprobante/);
    global.fetch = async () => Response.json({ message: 'No autenticado' }, { status: 401 });
    await assert.rejects(api.obtenerComprobante(9), /sesión expiró/);
    global.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(api.obtenerComprobante(9), /Revisa tu conexión/);
  } finally { global.fetch = anterior; }
});
