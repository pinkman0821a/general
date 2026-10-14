const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { render, ejemplo, tecnicos } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const Detalle = require('../src/components/servicios/DetalleServicio.tsx').default;
const { FichaServicio } = require('../src/components/servicios/DetalleServicio.tsx');
const Trabajo = require('../src/components/servicios/TrabajoRealizado.tsx').default;
const Fotos = require('../src/components/servicios/fotos/FotosServicio.tsx').default;
const Comprobante = require('../src/components/servicios/ComprobantePago.tsx').default;
const Eliminar = require('../src/components/servicios/EliminarServicio.tsx').default;
const props = { servicio: { ...ejemplo, tarjeteria: 'Sunjung', cabezal: 'DX7', observaciones: 'Revisar conectores' },
  coordinador: false, tecnico: 'Juan', ocupado: false, cerrar() {}, editar() {}, cambiarEstado() {} };
const zona = (html, nombre) => html.match(new RegExp(`<section[^>]*aria-label="${nombre}"[^>]*>([\\s\\S]*?)</section>`))?.[1];

test('Información principal prioriza máquina, teléfono, dirección, ciudad y fecha completa', () => {
  const html = render(FichaServicio, props);
  const principal = zona(html, 'Información principal');
  assert.ok(principal);
  let anterior = -1;
  for (const [etiqueta, valor] of [['Máquina', ejemplo.maquina], ['Teléfono', ejemplo.cliente_telefono],
    ['Dirección', ejemplo.direccion], ['Ciudad', ejemplo.ciudad], ['Fecha programada', '15 de octubre de 2026']]) {
    const posicion = principal.indexOf(`<dt>${etiqueta}</dt>`);
    assert.ok(posicion > anterior);
    assert.ok(principal.includes(valor)); anterior = posicion;
  }
  assert.ok(html.indexOf('Información principal') < html.indexOf('Información técnica'));
  assert.ok(html.indexOf('Información técnica') < html.indexOf('Ejecución del servicio'));
  assert.match(html, /Publicidad ABC/);
  assert.match(html, /servicio-detalle-resumen[^]*Servicio presencial[^]*Pendiente/);
  assert.doesNotMatch(principal, /Tipo de falla|Tarjetería|Cabezal|Revisar conectores/);
});

test('Información técnica conserva valores y omite etiquetas vacías; observaciones pertenecen a ejecución', () => {
  const html = render(FichaServicio, props), tecnica = zona(html, 'Información técnica');
  for (const valor of ['Servicio presencial', ejemplo.tipo_falla, 'Sunjung', 'DX7']) assert.ok(tecnica.includes(valor));
  assert.doesNotMatch(tecnica, /Revisar conectores/);
  assert.match(zona(html, 'Ejecución del servicio'), /Observaciones[^]*Revisar conectores/);
  const remoto = render(FichaServicio, { ...props, servicio: { ...ejemplo, tipo: 'servicio_remoto', ciudad: null, direccion: null } });
  assert.doesNotMatch(zona(remoto, 'Información principal'), /<dt>Dirección|<dt>Ciudad/);
  assert.doesNotMatch(zona(remoto, 'Información técnica'), /<dt>Tarjetería|<dt>Cabezal/);
});

test('Ejecución mantiene estado, edición de trabajo, guardado y fotos sin agregar funciones', () => {
  const cambios = []; let guardados = 0;
  const ficha = FichaServicio({ ...props, trabajo: 'REVISION', cambiarTrabajo: valor => cambios.push(valor),
    guardarTrabajo: () => guardados++, cambiarEstado: valor => cambios.push(valor),
    children: require('react').createElement(Fotos, { servicioId: ejemplo.id }) });
  const ejecucion = encontrarTodos(ficha, nodo => nodo.props?.['aria-label'] === 'Ejecución del servicio')[0];
  const trabajo = encontrarTodos(ejecucion, nodo => nodo.type === Trabajo)[0];
  assert.equal(trabajo.props.valor, 'REVISION');
  trabajo.props.cambiar('CALIBRACION');
  encontrarTodos(ejecucion, nodo => nodo.type === 'button' && nodo.props.children === 'Guardar trabajo')[0].props.onClick();
  encontrarTodos(ejecucion, nodo => nodo.type === 'select')[0].props.onChange({ target: { value: 'en_proceso' } });
  assert.deepEqual(cambios, ['CALIBRACION', 'en_proceso']); assert.equal(guardados, 1);
  assert.equal(encontrarTodos(ejecucion, nodo => nodo.type === Fotos)[0].props.servicioId, ejemplo.id);
  assert.match(render(FichaServicio, { ...props, ocupado: true, cambiarTrabajo() {} }), /aria-label="Trabajo realizado"[^>]*disabled/);
});

for (const coordinador of [false, true]) test(`Detalle reorganizado preserva fotos y permisos administrativos: ${coordinador}`, async () => {
  const anterior = global.fetch;
  global.fetch = async () => Response.json({ status: 'ok', servicio: ejemplo });
  const componente = montar(Detalle, { id: ejemplo.id, coordinador, tecnicos,
    cerrar() {}, editar() {}, alGuardar() {}, onOcupado() {}, alEliminar() {} });
  try {
    componente.render(); componente.activar(); await terminar();
    const arbol = componente.render(), ficha = encontrarTodos(arbol, nodo => nodo.type === FichaServicio)[0];
    assert.equal(encontrarTodos(ficha, nodo => nodo.type === Fotos).length, 1);
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === Eliminar).length, coordinador ? 1 : 0);
    const comprobante = encontrarTodos(arbol, nodo => nodo.type === Comprobante)[0];
    assert.equal(comprobante.props.coordinador, coordinador);
    if (!coordinador) assert.equal(render(Comprobante, comprobante.props), '');
    const html = render(FichaServicio, ficha.props);
    assert.equal(html.includes('>Editar<'), coordinador);
    assert.equal(html.includes('Técnico asignado'), coordinador);
    assert.equal(html.includes('Volver al listado'), !coordinador);
    assert.match(html, /Fotos del servicio/);
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('CSS del detalle usa una columna móvil, texto completo, controles legibles y columnas según ancho del panel', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/servicioDetalle.css'), 'utf8');
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /white-space: pre-wrap/);
  assert.match(css, /@container \(min-width: 560px\)/);
  assert.match(css, /\.servicio-detalle-ejecucion :is\(input, select\) \{ font-size: 16px/);
  assert.doesNotMatch(css, /overflow-x:\s*scroll|text-overflow:\s*ellipsis/);
});
