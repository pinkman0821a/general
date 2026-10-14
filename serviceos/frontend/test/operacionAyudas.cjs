const { ejemplo } = require('./serviciosTestAyudas.cjs');
const servicio = { ...ejemplo, tecnico_nombre: 'Juan' };
const disponible = { id: 2, nombre: 'Juan', activo: 1, estado: 'disponible', motivo: null, presenciales: [], remotos: [] };
const tecnicos = [
  { ...disponible, estado: 'programado', presenciales: [servicio] },
  { ...disponible, id: 3, nombre: 'Carlos', remotos: [{ ...servicio, id: 10, tecnico_id: 3, tecnico_nombre: 'Carlos', tipo: 'servicio_remoto', ciudad: null }] },
  { ...disponible, id: 4, nombre: 'Bloqueado', estado: 'no_disponible', motivo: 'Viaje' },
  { ...disponible, id: 5, nombre: 'Sobrecarga', estado: 'sobrecarga', presenciales: [servicio, { ...servicio, id: 11 }] },
];
const agenda = { status: 'ok', mes: '2026-10', hoy: '2026-10-15', dias: Array.from({ length: 31 }, (_, indice) => ({
  fecha: `2026-10-${String(indice + 1).padStart(2, '0')}`, tecnicos: indice === 14 ? tecnicos : [disponible],
})) };
const inicio = { status: 'ok', hoy: '2026-10-15', resumen: { servicios_hoy: 8, en_proceso: 2, realizados: 3, tecnicos_libres: 1 },
  servicios: [servicio, tecnicos[1].remotos[0]], tecnicos };
module.exports = { servicio, disponible, tecnicos, agenda, inicio };
