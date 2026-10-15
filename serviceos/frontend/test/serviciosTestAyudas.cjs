const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');

// Mismo patrón de Taller: transpilar y renderizar los componentes reales sin dependencias nuevas.
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const resultado = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2023, esModuleInterop: true,
      },
    });
    module._compile(resultado.outputText, filename);
  };
}
require.extensions['.css'] = () => {};

const ejemplo = {
  id: 9, tipo: 'servicio_presencial', estado: 'pendiente', cliente_nombre: 'Publicidad ABC',
  cliente_telefono: '3001234567', fecha_programada: '2026-10-15', tecnico_id: 2,
  maquina: 'Plotter ecosolvente 1.80 m', tipo_falla: 'Caída de color negro',
  ciudad: 'Bogotá', direccion: 'Calle 1', valor_servicio: 250000,
  observaciones: null,
};
const tecnicos = [{ id: 2, nombre: 'Juan', activo: 1 }, { id: 3, nombre: 'Inactivo', activo: 0 }];
const render = (Componente, props, ruta = '/') => renderToStaticMarkup(React.createElement(MemoryRouter,
  { initialEntries: [ruta] }, React.createElement(Componente, props)));
module.exports = { render, ejemplo, tecnicos };
