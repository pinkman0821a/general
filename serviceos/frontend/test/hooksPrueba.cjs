const React = require('react');

// Ejecuta handlers y efectos de componentes reales, conservando estado entre renders.
function montar(Componente, iniciales) {
  const estados = [], refs = [], efectos = [], pendientes = [];
  let props = iniciales;
  return {
    render(nuevas = props) {
      props = nuevas;
      let estado = 0, ref = 0, efecto = 0;
      const originales = { useState: React.useState, useRef: React.useRef, useEffect: React.useEffect };
      React.useState = inicial => {
        const indice = estado++;
        if (!(indice in estados)) estados[indice] = typeof inicial === 'function' ? inicial() : inicial;
        return [estados[indice], valor => { estados[indice] = typeof valor === 'function' ? valor(estados[indice]) : valor; }];
      };
      React.useRef = inicial => refs[ref++] ??= { current: inicial };
      React.useEffect = (ejecutar, deps) => {
        const indice = efecto++, anterior = efectos[indice];
        if (!anterior || !deps || deps.some((valor, posicion) => valor !== anterior.deps?.[posicion])) {
          pendientes.push(() => {
            anterior?.limpiar?.();
            efectos[indice] = { deps, limpiar: ejecutar() };
          });
        }
      };
      try { return Componente(props); } finally { Object.assign(React, originales); }
    },
    activar() { pendientes.splice(0).forEach(ejecutar => ejecutar()); },
    desmontar() { efectos.forEach(efecto => efecto?.limpiar?.()); },
  };
}

function encontrarTodos(elemento, predicado, resultados = []) {
  if (!elemento || typeof elemento !== 'object') return resultados;
  if (Array.isArray(elemento)) elemento.forEach(hijo => encontrarTodos(hijo, predicado, resultados));
  else {
    if (predicado(elemento)) resultados.push(elemento);
    encontrarTodos(elemento.props?.children, predicado, resultados);
  }
  return resultados;
}
const terminar = () => new Promise(resolve => setImmediate(resolve));
module.exports = { montar, encontrarTodos, terminar };
