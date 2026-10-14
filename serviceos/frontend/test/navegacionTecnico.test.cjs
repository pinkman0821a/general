const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo } = require('./serviciosTestAyudas.cjs');
const React = require('react');
const rutas = [];
const rutaRouter = require.resolve('react-router-dom');
const router = require('react-router-dom');
require.cache[rutaRouter].exports = { ...router, useNavigate: () => (destino) => rutas.push(destino) };
const Topbar = require('../src/components/TecnicoTopbarSecundario.tsx').default;
const ServiciosAcceso = require('../src/components/servicios/ServiciosAcceso.tsx').default;
const TallerAcceso = require('../src/components/taller/TallerAcceso.tsx').default;
const TecnicoInicio = require('../src/pages/TecnicoInicioPage.tsx').default;
const { FichaServicio } = require('../src/components/servicios/DetalleServicio.tsx');

// Render de los accesos reales con la sesión ya resuelta; los demás hooks conservan su implementación.
function renderAcceso(Componente, rol) {
  const original = React.useState;
  let indice = 0;
  React.useState = (inicial) => {
    indice += 1;
    if (indice === 1) return [{ id: 2, nombre: 'Juan', user: 'juan', rol }, () => {}];
    if (indice === 2) return [false, () => {}];
    return original(inicial);
  };
  try { return render(Componente, {}); } finally { React.useState = original; }
}

for (const [nombre, Componente] of [['Servicios', ServiciosAcceso], ['Taller', TallerAcceso]]) {
  test(`Técnico en ${nombre} tiene Atrás visible con ArrowLeft y destino fijo /tecnico`, () => {
    const html = renderAcceso(Componente, 'tecnico');
    assert.match(html, /<button[^>]*type="button"[^>]*class="tecnico-atras"[^>]*>/);
    assert.match(html, /lucide-arrow-left/);
    assert.match(html, /<\/svg>Atrás<\/button>/);
    assert.equal((html.match(/class="tecnico-atras"/g) || []).length, 1);
    assert.doesNotMatch(html, /Volver a mi inicio/);
    const cabecera = Topbar();
    const boton = cabecera.props.children[0].props.children[0];
    rutas.length = 0;
    boton.props.onClick();
    assert.deepEqual(rutas, ['/tecnico']);
  });
  test(`Coordinador en ${nombre} conserva su layout sin botón Atrás técnico`, () => {
    const html = renderAcceso(Componente, 'coordinador');
    assert.match(html, /class="sidebar"/);
    assert.doesNotMatch(html, /tecnico-atras|Volver a mi inicio/);
  });
}

test('El inicio técnico no recibe el botón Atrás', () => {
  assert.doesNotMatch(render(TecnicoInicio, {}), /tecnico-atras/);
});

test('El detalle técnico tiene una acción distinta para volver al listado', () => {
  let cierres = 0;
  const props = { servicio: ejemplo, coordinador: false, tecnico: 'Juan', ocupado: false,
    cerrar() { cierres++; }, editar() {}, cambiarEstado() {} };
  const html = render(FichaServicio, props);
  assert.match(html, />Volver al listado<\/button>/);
  assert.doesNotMatch(html, /tecnico-atras/);
  const ficha = FichaServicio(props);
  const cabecera = ficha.props.children[0];
  const boton = cabecera.props.children.find((elemento) => elemento.type === 'button');
  assert.equal(boton.props.disabled, false);
  boton.props.onClick();
  assert.equal(cierres, 1);
});
