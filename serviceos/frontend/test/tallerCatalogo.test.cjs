const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Render estático de los componentes reales sin añadir dependencias de pruebas.
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const resultado = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2023,
        esModuleInterop: true,
      },
    });
    module._compile(resultado.outputText, filename);
  };
}
require.extensions['.css'] = () => {};

const { ContextoCatalogoAccesorios } = require('../src/components/taller/useCatalogoAccesorios.ts');
const Checklist = require('../src/components/taller/ChecklistAccesorios.tsx').default;
const Formulario = require('../src/components/taller/FormularioRecepcion.tsx').default;
const Pagina = require('../src/pages/TallerPage.tsx').default;
const servicio = require('../src/services/tallerCatalogoService.ts');

function render(Component, props, lista = []) {
  const estado = {
    lista, cargando: false, errorCarga: '', errorOperacion: '', ocupado: false,
    reintentar() {}, agregar() {}, eliminar() {},
  };
  return renderToStaticMarkup(React.createElement(ContextoCatalogoAccesorios.Provider,
    { value: estado }, React.createElement(Component, props)));
}

test('Catalogo vacio no inventa presets y permite accesorios personalizados', () => {
  const html = render(Checklist, { nombres: [], cambiar() {} });
  assert.doesNotMatch(html, /type="checkbox"/);
  assert.doesNotMatch(html, /Cable de poder|Cable USB|Cuchilla|Portacuchilla/);
  assert.match(html, /No hay accesorios frecuentes/);
  assert.match(html, /Agregar otro accesorio/);
});

test('El checklist usa opciones reales del catalogo sin preseleccionarlas', () => {
  const html = render(Checklist, { nombres: [], cambiar() {} }, [{ id: 23, nombre: 'Adaptador especial' }]);
  assert.match(html, /Adaptador especial/);
  assert.equal((html.match(/type="checkbox"/g) || []).length, 1);
  assert.doesNotMatch(html, /checked=""/);
});

test('Un accesorio retirado del catalogo conserva su nombre historico y puede desmarcarse', () => {
  const props = { nombres: ['CABLE USB'], registrados: ['CABLE USB'], cambiar() {} };
  const antes = render(Checklist, props, [{ id: 3, nombre: 'Cable USB' }]);
  assert.equal((antes.match(/type="checkbox"/g) || []).length, 1);
  const despues = render(Checklist, props);
  assert.match(despues, /CABLE USB/);
  assert.match(despues, /checked=""/);
  const desmarcado = render(Checklist, { ...props, nombres: [] });
  assert.match(desmarcado, /CABLE USB/);
  assert.doesNotMatch(desmarcado, /checked=""/);
});

test('Formulario de ingreso y edicion excluyen serial y conservan accesorios historicos', () => {
  const props = { alGuardar() {}, cancelar() {}, onOcupado() {} };
  const ingreso = render(Formulario, props);
  assert.doesNotMatch(ingreso, /Serial|maquina_serial/);
  assert.doesNotMatch(ingreso, /type="checkbox"/);
  const edicion = render(Formulario, { ...props, recepcion: {
    id: 2, cliente_nombre: 'Cliente', cliente_telefono: '300', maquina_tipo: 'Laser',
    fecha_ingreso: '2026-10-09', falla_reportada: 'Falla', maquina_serial: 'Valor historico',
    accesorios: [{ id: 55, nombre: 'Adaptador retirado', devuelto: 0 }],
  } });
  assert.doesNotMatch(edicion, /Serial|maquina_serial|Valor historico/);
  assert.match(edicion, /Adaptador retirado/);
  assert.match(edicion, /checked=""/);
});

test('Administracion y confirmacion del catalogo solo se muestran al coordinador', () => {
  const usuario = { id: 1, nombre: 'Usuario', user: 'usuario', rol: 'coordinador' };
  const html = render(Pagina, { usuario }, [{ id: 5, nombre: 'Accesorio frecuente' }]);
  assert.match(html, /Accesorios frecuentes/);
  assert.match(html, /Eliminar Accesorio frecuente del cat/);
  assert.doesNotMatch(render(Pagina, { usuario: { ...usuario, rol: 'tecnico' } }), /Accesorios frecuentes/);
  assert.doesNotMatch(html, /serial/i);
});

test('Servicio del catalogo usa credenciales, nombres recortados y elimina solo su endpoint', async () => {
  const anterior = global.fetch;
  const llamadas = [];
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return Response.json({ status: 'ok', accesorios: [], accesorio: { id: 7, nombre: 'Adaptador' } });
  };
  try {
    assert.deepEqual(await servicio.listarAccesoriosFrecuentes(), []);
    await servicio.crearAccesorioFrecuente('  Adaptador  ');
    await servicio.eliminarAccesorioFrecuente(7);
    assert.ok(llamadas.every((item) => item.opciones.credentials === 'include'));
    assert.deepEqual(JSON.parse(llamadas[1].opciones.body), { nombre: 'Adaptador' });
    assert.equal(llamadas[2].url, '/api/taller/accesorios-catalogo/7');
    assert.equal(llamadas[2].opciones.method, 'DELETE');
  } finally {
    global.fetch = anterior;
  }
});
