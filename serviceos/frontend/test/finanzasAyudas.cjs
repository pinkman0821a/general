const historico = [
  { mes: '2026-05', pago_generado: 600000 }, { mes: '2026-06', pago_generado: 720000 },
  { mes: '2026-07', pago_generado: 0 }, { mes: '2026-08', pago_generado: 800000 },
  { mes: '2026-09', pago_generado: 950000 }, { mes: '2026-10', pago_generado: 1200000 },
];
const tecnicos = [
  { id: 2, nombre: 'Andres Tecnico', activo: 1, servicios_con_pago: 5, pendientes: 2, en_proceso: 1, realizados: 2, pago_generado: 820000 },
  { id: 3, nombre: 'Carlos Técnico', activo: 0, servicios_con_pago: 3, pendientes: 1, en_proceso: 0, realizados: 2, pago_generado: 380000 },
];
const datos = {
  status: 'ok', mes: '2026-10', historico, tecnicos,
  historico_tecnicos: [...historico].reverse().map(fila => ({ mes: fila.mes, tecnicos: fila.pago_generado ? tecnicos : [] })),
  resumen: { ingresos_servicios: 800000, pago_tecnicos: 1200000, servicios_con_pago: 8, tecnicos_con_actividad: 2, promedio_por_servicio: 150000 },
  comparacion: { mes_anterior: '2026-09', pago_anterior: 950000, diferencia: 250000, porcentaje: 26.31578947368421 },
};
const detalle = {
  status: 'ok', mes: '2026-10', tecnico: { id: 2, nombre: 'Andres Tecnico', activo: 1 }, pago_generado: 200000,
  servicios: [
    { id: 7, fecha_programada: '2026-10-04', cliente_nombre: 'Cliente ABC', tipo: 'servicio_presencial',
      estado: 'pendiente', valor_servicio: 250000, pago_tecnico: 100000 },
    { id: 9, fecha_programada: '2026-10-15', cliente_nombre: 'Cliente DEF', tipo: 'instalacion',
      estado: 'realizado', valor_servicio: null, pago_tecnico: 100000 },
  ],
};
module.exports = { datos, detalle, tecnicos, historico };
