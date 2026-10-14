const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ejemplo } = require('./serviciosTestAyudas.cjs');
const { montar, encontrarTodos } = require('./hooksPrueba.cjs');
const router = require('react-router-dom');
const cacheRouter = require.cache[require.resolve('react-router-dom')];
const Formulario = require('../src/components/servicios/FormularioServicio.tsx').default;
const Filtros = require('../src/components/servicios/FiltrosServicios.tsx').default;
const coor = { id: 1, nombre: 'Coordinador', rol: 'coordinador' };

for (const accion of ['cancelar', 'guardar']) test(`nuevo=1 abre formulario y ${accion} limpia solo ese parámetro`, () => {
  let parametros = new URLSearchParams('nuevo=1&mes=2026-10&estado=en_proceso');
  let opciones;
  const destinos = [];
  cacheRouter.exports = { ...router, useNavigate: () => (ruta, config) => destinos.push({ ruta, config }), useLocation: () => ({ state: null }),
    useSearchParams: () => [parametros, (siguientes, config) => { parametros = siguientes; opciones = config; }] };
  delete require.cache[require.resolve('../src/pages/ServiciosPage.tsx')];
  const Pagina = require('../src/pages/ServiciosPage.tsx').default;
  const pagina = montar(Pagina, { usuario: coor });
  try {
    let arbol = pagina.render();
    const form = encontrarTodos(arbol, nodo => nodo.type === Formulario)[0];
    assert.equal(form.props.servicio, undefined);
    assert.equal(encontrarTodos(arbol, nodo => nodo.type === Filtros)[0].props.filtros.estado, 'en_proceso');
    if (accion === 'cancelar') form.props.cancelar(); else form.props.alGuardar(ejemplo);
    assert.equal(parametros.has('nuevo'), false); assert.equal(parametros.get('mes'), '2026-10');
    assert.equal(parametros.get('estado'), 'en_proceso'); assert.equal(opciones.replace, true);
    arbol = pagina.render(); assert.equal(encontrarTodos(arbol, nodo => nodo.type === Formulario).length, 0);
    if (accion === 'guardar') assert.equal(destinos[0].ruta, `/servicios/${ejemplo.id}`);
  } finally { pagina.desmontar(); cacheRouter.exports = router; delete require.cache[require.resolve('../src/pages/ServiciosPage.tsx')]; }
});
