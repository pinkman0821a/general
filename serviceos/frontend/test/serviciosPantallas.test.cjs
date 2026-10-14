const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ejemplo, tecnicos } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos, terminar } = require('./hooksPrueba.cjs');
const router = require('react-router-dom');
const cacheRouter = require.cache[require.resolve('react-router-dom')];
const AppRoutes = require('../src/routes/AppRoutes.tsx').default;
const AuthGate = require('../src/components/AuthGate.tsx').default;
const Detalle = require('../src/components/servicios/DetalleServicio.tsx').default;
const { FichaServicio } = require('../src/components/servicios/DetalleServicio.tsx');
const Formulario = require('../src/components/servicios/FormularioServicio.tsx').default;
const Lista = require('../src/components/servicios/ListaServicios.tsx').default;
const Filtros = require('../src/components/servicios/FiltrosServicios.tsx').default;
const Comisiones = require('../src/components/servicios/ComisionesMes.tsx').default;
const Eliminar = require('../src/components/servicios/EliminarServicio.tsx').default;
const Comprobante = require('../src/components/servicios/ComprobantePago.tsx').default;
const { volverAlListado } = require('../src/components/servicios/serviciosNavegacion.ts');
const coor = { id: 1, nombre: 'Coordinador', rol: 'coordinador' };
const tecnico = { id: 2, nombre: 'Juan', rol: 'tecnico' };

function pagina(nombre, usuario, { id = '9', query = 'mes=2026-10', state = null } = {}) {
  const destinos = []; let parametros = new URLSearchParams(query);
  cacheRouter.exports = { ...router, useParams: () => ({ id }), useLocation: () => ({ state }),
    useNavigate: () => (ruta, opciones) => destinos.push({ ruta, opciones }),
    useSearchParams: () => [parametros, nuevos => { parametros = nuevos; }] };
  const archivo = require.resolve(`../src/pages/${nombre}.tsx`);
  delete require.cache[archivo];
  const componente = montar(require(archivo).default, { usuario });
  return { componente, destinos, query: () => parametros,
    cerrar() { componente.desmontar(); cacheRouter.exports = router; delete require.cache[archivo]; } };
}

test('React Router separa listado y detalle dedicado bajo AuthGate', () => {
  const gate = encontrarTodos(AppRoutes(), nodo => nodo.props?.element?.type === AuthGate)[0];
  const listado = encontrarTodos(gate, nodo => nodo.props?.path === '/servicios')[0];
  const detalle = encontrarTodos(gate, nodo => nodo.props?.path === '/servicios/:id')[0];
  assert.equal(listado.props.element.props.detalle, undefined);
  assert.equal(detalle.props.element.props.detalle, true);
});

test('Listado conserva controles; abre ruta dedicada y restaura mes/estado/tipo/técnico/búsqueda', () => {
  const consulta = 'mes=2026-09&estado=en_proceso&tipo=servicio_remoto&tecnico_id=2&buscar=Cliente';
  const vista = pagina('ServiciosPage', coor, { query: consulta });
  try {
    const arbol = vista.componente.render();
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === Detalle).length, 0);
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === Comisiones).length, 1);
    const filtros = encontrarTodos(arbol, nodo => nodo.type === Filtros)[0];
    assert.deepEqual(filtros.props.filtros, { mes: '2026-09', estado: 'en_proceso', tipo: 'servicio_remoto', tecnico_id: '2', buscar: 'Cliente' });
    assert.equal(encontrarTodos(arbol, nodo => nodo.props?.['aria-label'] === 'Resumen de resultados visibles').length, 1);
    encontrarTodos(arbol, nodo => nodo.type === Lista)[0].props.abrir(9);
    assert.deepEqual(vista.destinos[0], { ruta: '/servicios/9', opciones: { state: { volverServicios: `/servicios?${consulta}` } } });
    filtros.props.cambiar({ ...filtros.props.filtros, buscar: 'Otro cliente' });
    assert.equal(vista.query().get('buscar'), 'Otro cliente');
  } finally { vista.cerrar(); }
});

for (const usuario of [tecnico, coor]) test(`Detalle dedicado sin filtros, Excel, KPIs ni lista para ${usuario.rol}`, () => {
  const vista = pagina('ServicioDetallePage', usuario);
  try {
    const arbol = vista.componente.render();
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === Detalle)[0].props.id, 9);
    for (const Componente of [Lista, Filtros, Comisiones]) assert.equal(encontrarTodos(arbol, nodo => nodo.type === Componente).length, 0);
    assert.equal(encontrarTodos(arbol, nodo => nodo.props?.['aria-label'] === 'Resumen de resultados visibles').length, 0);
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === 'input' && ['month', 'search'].includes(nodo.props.type)).length, 0);
  } finally { vista.cerrar(); }
});

test('Atrás coordinador conserva contexto y topbar técnico vuelve al listado; destino por defecto seguro', () => {
  const destino = '/servicios?mes=2026-09&estado=pendiente&buscar=Prueba';
  const vista = pagina('ServicioDetallePage', coor, { state: { volverServicios: destino } });
  try {
    encontrarTodos(vista.componente.render(), nodo => nodo.type === 'button')[0].props.onClick();
    assert.equal(vista.destinos[0].ruta, destino);
    delete require.cache[require.resolve('../src/components/TecnicoTopbarSecundario.tsx')];
    const Topbar = require('../src/components/TecnicoTopbarSecundario.tsx').default;
    encontrarTodos(Topbar({ destino }), nodo => nodo.type === 'button')[0].props.onClick();
    assert.equal(vista.destinos[1].ruta, destino);
    assert.equal(volverAlListado(null), '/servicios');
    assert.equal(volverAlListado({ volverServicios: 'https://otro.test' }), '/servicios');
  } finally { vista.cerrar(); delete require.cache[require.resolve('../src/components/TecnicoTopbarSecundario.tsx')]; }
});

test('Edición coordinador permanece en detalle dedicado y vuelve al detalle al guardar', () => {
  const vista = pagina('ServicioDetallePage', coor);
  try {
    encontrarTodos(vista.componente.render(), nodo => nodo.type === Detalle)[0].props.editar(ejemplo);
    const form = encontrarTodos(vista.componente.render(), nodo => nodo.type === Formulario)[0];
    assert.equal(form.props.servicio.id, 9);
    assert.equal(typeof form.props.alEliminar, 'function');
    form.props.alGuardar(ejemplo);
    assert.equal(encontrarTodos(vista.componente.render(), nodo => nodo.type === Detalle).length, 1);
    assert.equal(vista.destinos.length, 0);
  } finally { vista.cerrar(); }
});

test('Técnico no puede abrir formulario administrativo del detalle', () => {
  const vista = pagina('ServicioDetallePage', tecnico);
  try {
    encontrarTodos(vista.componente.render(), nodo => nodo.type === Detalle)[0].props.editar(ejemplo);
    assert.equal(encontrarTodos(vista.componente.render(), nodo => nodo.type === Formulario).length, 0);
  } finally { vista.cerrar(); }
});

for (const status of [403, 404]) test(`Detalle directo maneja API ${status} sin datos de servicio ni controles administrativos`, async () => {
  const anterior = global.fetch, llamadas = [];
  const mensaje = status === 403 ? 'Servicio ajeno' : 'Servicio no encontrado';
  global.fetch = async (ruta, opciones) => { llamadas.push({ ruta, opciones }); return Response.json({ status: 'error', message: mensaje }, { status }); };
  const componente = montar(Detalle, { id: 99, coordinador: false, tecnicos, cerrar() {}, editar() {}, alGuardar() {}, onOcupado() {} });
  try {
    componente.render(); componente.activar(); await terminar();
    const arbol = componente.render();
    assert.equal(llamadas[0].ruta, '/api/servicios/99');
    assert.equal(llamadas[0].opciones.credentials, 'include');
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === FichaServicio).length, 0);
    assert.equal(encontrarTodos(arbol, nodo => nodo.props?.role === 'alert')[0].props.children, mensaje);
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === Eliminar || nodo.type === Comprobante).length, 0);
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('ID inválido no monta el detalle ni solicita API; éxito de eliminación aparece al volver al listado', () => {
  const vista = pagina('ServicioDetallePage', tecnico, { id: 'abc' });
  try {
    const arbol = vista.componente.render();
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === Detalle).length, 0);
    assert.match(encontrarTodos(arbol, nodo => nodo.props?.role === 'alert')[0].props.children, /ID de servicio inválido/);
  } finally { vista.cerrar(); }
  const lista = pagina('ServiciosPage', coor, { state: { mensajeServicios: 'Servicio eliminado correctamente.' } });
  try {
    assert.equal(encontrarTodos(lista.componente.render(), nodo => nodo.props?.role === 'status')[0].props.children, 'Servicio eliminado correctamente.');
  } finally { lista.cerrar(); }
});

test('Al abrir detalle comienza arriba sin heredar el desplazamiento del listado', () => {
  const anterior = global.window, desplazamientos = [];
  global.window = { scrollTo: (...args) => desplazamientos.push(args) };
  const vista = pagina('ServicioDetallePage', tecnico);
  try {
    vista.componente.render(); vista.componente.activar();
    vista.componente.render(); vista.componente.activar();
    assert.deepEqual(desplazamientos, [[0, 0]]);
  } finally { vista.cerrar(); global.window = anterior; }
});
