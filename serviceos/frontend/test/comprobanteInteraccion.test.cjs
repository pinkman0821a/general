const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ejemplo } = require('./serviciosTestAyudas.cjs');
const React = require('react');
const Bloque = require('../src/components/servicios/ComprobantePago.tsx').default;

// Ejecuta la gestión real y sus handlers con estado/efectos controlados, sin agregar un DOM de pruebas.
function montar(props) {
  const estados = [], refs = [], efectos = [];
  const Gestion = Bloque(props).type;
  let primera = true;
  return {
    render() {
      let indiceEstado = 0, indiceRef = 0;
      const originales = { useState: React.useState, useRef: React.useRef, useEffect: React.useEffect };
      React.useState = (inicial) => {
        const indice = indiceEstado++;
        if (!(indice in estados)) estados[indice] = typeof inicial === 'function' ? inicial() : inicial;
        return [estados[indice], (valor) => { estados[indice] = typeof valor === 'function' ? valor(estados[indice]) : valor; }];
      };
      React.useRef = (inicial) => refs[indiceRef++] ??= { current: inicial };
      React.useEffect = (efecto) => { if (primera) efectos.push(efecto); };
      try { return Gestion(props); } finally { Object.assign(React, originales); }
    },
    activar() { primera = false; efectos.forEach((efecto, indice) => { efectos[indice] = efecto(); }); },
    desmontar() { efectos.forEach((limpiar) => limpiar?.()); },
  };
}

function encontrar(elemento, predicado) {
  if (!elemento || typeof elemento !== 'object') return undefined;
  if (Array.isArray(elemento)) {
    for (const hijo of elemento) { const encontrado = encontrar(hijo, predicado); if (encontrado) return encontrado; }
    return undefined;
  }
  if (predicado(elemento)) return elemento;
  return encontrar(elemento.props?.children, predicado);
}
const boton = (arbol, texto) => encontrar(arbol, (elemento) => elemento.type === 'button' && elemento.props.children === texto);
const archivoInput = (arbol) => encontrar(arbol, (elemento) => elemento.type === 'input' && elemento.props.type === 'file');
const texto = (arbol, contenido) => encontrar(arbol, (elemento) => elemento.type === 'p'
  && typeof elemento.props.children === 'string' && elemento.props.children.includes(contenido));
const terminar = () => new Promise((resolve) => setImmediate(resolve));

test('Archivo inválido muestra error antes de enviar y no modifica el detalle', () => {
  const componente = montar({ servicio: ejemplo, coordinador: true, ocupado: false, alGuardar() { assert.fail(); }, onOcupado() {} });
  try {
    let arbol = componente.render(); componente.activar();
    archivoInput(arbol).props.onChange({ target: { files: [new File(['PDF'], 'pago.pdf', { type: 'application/pdf' })], value: 'pago.pdf' } });
    arbol = componente.render();
    assert.ok(texto(arbol, 'JPEG, PNG o WebP'));
    assert.equal(boton(arbol, 'Confirmar subida'), undefined);
  } finally { componente.desmontar(); }
});

test('Reemplazar pide confirmación, bloquea doble envío y actualiza tras confirmar éxito', async () => {
  const anterior = global.fetch, llamadas = [], guardados = [], ocupaciones = [];
  let resolver;
  global.fetch = (url, opciones) => { llamadas.push({ url, opciones }); return new Promise((resolve) => { resolver = resolve; }); };
  const servicio = { ...ejemplo, tiene_comprobante: true, comprobante_nombre: 'anterior.jpg' };
  const componente = montar({ servicio, coordinador: true, ocupado: false,
    alGuardar(guardado) { guardados.push(guardado); }, onOcupado(valor) { ocupaciones.push(valor); } });
  try {
    let arbol = componente.render(); componente.activar();
    archivoInput(arbol).props.onChange({ target: { files: [new File(['PNG'], 'nuevo.png', { type: 'image/png' })], value: 'nuevo.png' } });
    arbol = componente.render(); assert.ok(texto(arbol, 'será reemplazado')); assert.equal(llamadas.length, 0);
    const confirmar = boton(arbol, 'Confirmar subida');
    confirmar.props.onClick(); confirmar.props.onClick();
    assert.equal(llamadas.length, 1); assert.equal(guardados.length, 0);
    assert.equal(boton(componente.render(), 'Reemplazar').props.disabled, true);
    resolver(Response.json({ status: 'ok', servicio: { ...servicio, comprobante_nombre: 'nuevo.png' } }));
    await terminar();
    assert.equal(guardados[0].comprobante_nombre, 'nuevo.png'); assert.deepEqual(ocupaciones, [true, false]);
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('Eliminar pide confirmación; cancelar no envía; confirmar actualiza detalle', async () => {
  const anterior = global.fetch, llamadas = [], guardados = [];
  global.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return Response.json({ status: 'ok', servicio: { ...ejemplo, tiene_comprobante: false } });
  };
  const componente = montar({ servicio: { ...ejemplo, tiene_comprobante: true }, coordinador: true, ocupado: false,
    alGuardar(guardado) { guardados.push(guardado); }, onOcupado() {} });
  try {
    let arbol = componente.render(); componente.activar();
    boton(arbol, 'Eliminar').props.onClick(); arbol = componente.render();
    assert.ok(texto(arbol, '¿Eliminar el comprobante de pago?'));
    boton(arbol, 'Cancelar').props.onClick(); assert.equal(llamadas.length, 0);
    boton(componente.render(), 'Eliminar').props.onClick();
    boton(componente.render(), 'Confirmar eliminación').props.onClick(); await terminar();
    assert.equal(llamadas[0].opciones.method, 'DELETE'); assert.equal(guardados[0].tiene_comprobante, false);
  } finally { componente.desmontar(); global.fetch = anterior; }
});

test('Error de subida conserva la referencia anterior y muestra mensaje del backend', async () => {
  const anterior = global.fetch;
  global.fetch = async () => Response.json({ message: 'No se pudo guardar el archivo' }, { status: 500 });
  const componente = montar({ servicio: { ...ejemplo, tiene_comprobante: true, comprobante_nombre: 'anterior.jpg' },
    coordinador: true, ocupado: false, alGuardar() { assert.fail('No debe modificar el detalle'); }, onOcupado() {} });
  try {
    const arbol = componente.render(); componente.activar();
    archivoInput(arbol).props.onChange({ target: { files: [new File(['JPG'], 'nuevo.jpg', { type: 'image/jpeg' })], value: 'nuevo.jpg' } });
    boton(componente.render(), 'Confirmar subida').props.onClick(); await terminar();
    assert.ok(texto(componente.render(), 'No se pudo guardar el archivo'));
    assert.equal(boton(componente.render(), 'Reemplazar').props.disabled, false);
  } finally { componente.desmontar(); global.fetch = anterior; }
});
