const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, ejemplo, tecnicos } = require('./serviciosTestAyudas.cjs');
const Formulario = require('../src/components/servicios/FormularioServicio.tsx').default;
const { cambiarTipo, construirPayload, valoresIniciales } = require('../src/components/servicios/formularioServicioAyudas.ts');
const { tiposServicio, estadosServicio, mesActual, mostrarFecha, moverMes } = require('../src/components/servicios/serviciosAyudas.ts');

function formulario(tipo) {
  return render(Formulario, { servicio: { ...ejemplo, tipo }, tecnicos, cargandoTecnicos: false, errorTecnicos: '',
    alGuardar() {}, cancelar() {}, onOcupado() {} });
}

test('Los cinco tipos y tres estados tienen etiquetas humanas exactas', () => {
  assert.deepEqual(Object.values(tiposServicio), ['Garantía', 'Servicio presencial', 'Servicio remoto', 'Instalación', 'Instalación remota']);
  assert.deepEqual(estadosServicio, { pendiente: 'Pendiente', en_proceso: 'En proceso', realizado: 'Realizado' });
  for (const etiqueta of Object.values(tiposServicio)) assert.ok(formulario('garantia').includes(etiqueta));
});

for (const tipo of Object.keys(tiposServicio)) {
  test(`Formulario dinámico ${tipo}: ubicación y valor pertinentes`, () => {
    const html = formulario(tipo);
    const presencial = ['garantia', 'servicio_presencial', 'instalacion'].includes(tipo);
    const valor = ['servicio_presencial', 'servicio_remoto'].includes(tipo);
    for (const campo of ['ciudad', 'direccion']) assert.equal(html.includes(`name="${campo}"`), presencial);
    assert.equal(html.includes('name="valor_servicio"'), valor);
    assert.match(html.match(/<input[^>]*name="maquina"[^>]*>/)[0], /required=""/);
    const falla = html.match(/<input[^>]*name="tipo_falla"[^>]*>/);
    if (tipo === 'instalacion' || tipo === 'instalacion_remota') assert.equal(falla, null);
    else assert.match(falla[0], /required=""/);
    assert.doesNotMatch(html, /name="tarjeteria"|name="cabezal"|name="trabajo_realizado"/);
    assert.doesNotMatch(html, /name="estado"|pago_tecnico/);
    assert.doesNotMatch(html, />Inactivo</);
  });
}

test('Cambiar a remoto limpia ubicación, y a garantía limpia valor sin recuperar datos ocultos', () => {
  const valores = valoresIniciales(ejemplo);
  const remoto = cambiarTipo(valores, 'servicio_remoto');
  assert.equal(remoto.ciudad, ''); assert.equal(remoto.direccion, '');
  assert.equal(cambiarTipo(remoto, 'servicio_presencial').ciudad, '');
  const garantia = cambiarTipo(valores, 'garantia');
  assert.equal(garantia.valor_servicio, '');
  assert.equal(cambiarTipo(garantia, 'servicio_presencial').valor_servicio, '');
});

for (const tipo of ['instalacion', 'instalacion_remota']) {
  test(`${tipo} limpia falla al cambiar tipo y envía null en POST/PATCH`, () => {
    const valores = cambiarTipo(valoresIniciales(ejemplo), tipo);
    assert.equal(valores.tipo_falla, '');
    assert.equal(construirPayload(valores).tipo_falla, null);
    assert.equal(construirPayload(valores, ejemplo).tipo_falla, null);
    assert.equal(cambiarTipo(valores, 'servicio_presencial').tipo_falla, '');
    assert.doesNotMatch(formulario(tipo), /name="tipo_falla"/);
  });
}
for (const tipo of ['garantia', 'servicio_presencial', 'servicio_remoto']) {
  test(`${tipo} exige falla; PATCH desde instalación también`, () => {
    const valores = cambiarTipo(valoresIniciales(ejemplo), tipo);
    assert.throws(() => construirPayload({ ...valores, tipo_falla: '' }), /tipo de falla/);
    const instalacion = { ...ejemplo, tipo: 'instalacion', tipo_falla: null, valor_servicio: null };
    const cambio = cambiarTipo(valoresIniciales(instalacion), tipo);
    cambio.valor_servicio = '250000';
    assert.throws(() => construirPayload(cambio, instalacion), /tipo de falla/);
    cambio.tipo_falla = 'Nueva falla';
    assert.equal(construirPayload(cambio, instalacion).tipo_falla, 'Nueva falla');
  });
}

test('POST recorta textos, envía IDs y COP numéricos y opcionales null, sin estado', () => {
  const valores = valoresIniciales(ejemplo);
  valores.cliente_nombre = '  Publicidad ABC  ';
  const payload = construirPayload(valores);
  const { id: _id, estado: _estado, ...esperado } = ejemplo;
  assert.deepEqual(payload, esperado);
  assert.equal(typeof payload.tecnico_id, 'number');
  assert.equal(typeof payload.valor_servicio, 'number');
});

test('PATCH solo manda cambios; observaciones no incluyen campos de agenda ni estado', () => {
  const valores = valoresIniciales(ejemplo);
  valores.observaciones = ' Revisar conexión ';
  assert.deepEqual(construirPayload(valores, ejemplo), { observaciones: 'Revisar conexión' });
  assert.deepEqual(construirPayload(valoresIniciales(ejemplo), ejemplo), {});
});

test('PATCH presencial a remoto borra ubicación con null para el contrato parcial del backend', () => {
  const payload = construirPayload(cambiarTipo(valoresIniciales(ejemplo), 'servicio_remoto'), ejemplo);
  assert.deepEqual(payload, { tipo: 'servicio_remoto', ciudad: null, direccion: null });
});

for (const tipo of Object.keys(tiposServicio)) {
  test(`Payload POST ${tipo} omite campos que no corresponden`, () => {
    const payload = construirPayload(cambiarTipo(valoresIniciales(ejemplo), tipo));
    if (tipo.endsWith('remoto') || tipo === 'instalacion_remota') {
      assert.ok(!('ciudad' in payload)); assert.ok(!('direccion' in payload));
    }
    if (['garantia', 'instalacion', 'instalacion_remota'].includes(tipo)) {
      assert.ok(!('valor_servicio' in payload));
      assert.equal(construirPayload(cambiarTipo(valoresIniciales(ejemplo), tipo), ejemplo).valor_servicio, null);
    }
  });
}

test('Valida máquina/falla, ubicación, técnico, fecha real y COP enteros positivos', () => {
  for (const campo of ['maquina', 'tipo_falla', 'cliente_nombre', 'cliente_telefono', 'ciudad', 'direccion', 'tecnico_id']) {
    assert.throws(() => construirPayload({ ...valoresIniciales(ejemplo), [campo]: '' }));
  }
  for (const valor of ['0', '-1', '2.5', '1e3', '250.000', '9007199254740992']) {
    assert.throws(() => construirPayload({ ...valoresIniciales(ejemplo), valor_servicio: valor }), /entero positivo/);
  }
  for (const fecha of ['2026-02-30', '2026-13-15', '0000-01-01', '']) {
    assert.throws(() => construirPayload({ ...valoresIniciales(ejemplo), fecha_programada: fecha }), /fecha/);
  }
});

test('Fechas locales y navegación mensual conservan el día incluso en zonas UTC negativas y positivas', () => {
  const anterior = process.env.TZ;
  try {
    for (const zona of ['America/Bogota', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = zona;
      assert.equal(mostrarFecha('2026-10-15'), '15 de octubre de 2026');
      assert.equal(mesActual(new Date(2026, 9, 1, 0, 1)), '2026-10');
      assert.equal(moverMes('2026-01', -1), '2025-12');
      assert.equal(moverMes('2026-12', 1), '2027-01');
    }
  } finally { if (anterior === undefined) delete process.env.TZ; else process.env.TZ = anterior; }
});
