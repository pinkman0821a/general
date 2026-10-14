import { construirDiaAgenda, type TecnicoAgenda, type ServicioAgenda, type BloqueoAgenda } from './agendaCalculo';

export function fechaColombia(fecha = new Date()) {
	const partes = new Intl.DateTimeFormat('en', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(fecha);
	const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(valor => valor.type === tipo)!.value;
	return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

export function fechasMesAgenda(mes: string) {
	const fecha = new Date(`${mes}-01T12:00:00Z`);
	fecha.setUTCMonth(fecha.getUTCMonth() + 1, 0);
	return Array.from({ length: fecha.getUTCDate() }, (_, indice) => `${mes}-${String(indice + 1).padStart(2, '0')}`);
}

async function consultarRangoAgenda(env: Env, desde: string, hasta: string) {
	// Lectura agrupada: no hay llamadas por técnico ni por día, ni escrituras de agenda.
	const [tecnicos, servicios, bloqueos] = await env.DB.batch([
		env.DB.prepare(`SELECT id, nombre, activo FROM usuarios u WHERE rol = 'tecnico' AND
			(activo = 1 OR EXISTS (SELECT 1 FROM servicios s WHERE s.tecnico_id = u.id AND s.fecha_programada BETWEEN ? AND ?))
			ORDER BY nombre COLLATE NOCASE ASC, id ASC`).bind(desde, hasta),
		env.DB.prepare(`SELECT s.id, s.tecnico_id, s.fecha_programada, s.tipo, s.estado, s.cliente_nombre, s.maquina, s.ciudad,
			u.nombre AS tecnico_nombre FROM servicios s JOIN usuarios u ON u.id = s.tecnico_id
			WHERE s.fecha_programada BETWEEN ? AND ? ORDER BY s.fecha_programada ASC, s.id ASC`).bind(desde, hasta),
		env.DB.prepare(`SELECT tecnico_id, fecha, motivo FROM tecnico_indisponibilidades WHERE fecha BETWEEN ? AND ?
			ORDER BY fecha ASC, tecnico_id ASC`).bind(desde, hasta),
	]);
	return { tecnicos: tecnicos.results as TecnicoAgenda[], servicios: servicios.results as ServicioAgenda[],
		bloqueos: bloqueos.results as BloqueoAgenda[] };
}

export async function consultarAgenda(env: Env, mes: string) {
	const fechas = fechasMesAgenda(mes);
	const datos = await consultarRangoAgenda(env, fechas[0], fechas[fechas.length - 1]);
	return { mes, hoy: fechaColombia(), dias: fechas.map(fecha => construirDiaAgenda(fecha, datos.tecnicos, datos.servicios, datos.bloqueos)) };
}

export async function consultarInicio(env: Env, hoy = fechaColombia()) {
	const datos = await consultarRangoAgenda(env, hoy, hoy);
	const dia = construirDiaAgenda(hoy, datos.tecnicos, datos.servicios, datos.bloqueos);
	const tecnicos = dia.tecnicos.filter(tecnico => tecnico.activo === 1);
	return { hoy, resumen: { servicios_hoy: datos.servicios.length,
		en_proceso: datos.servicios.filter(servicio => servicio.estado === 'en_proceso').length,
		realizados: datos.servicios.filter(servicio => servicio.estado === 'realizado').length,
		tecnicos_libres: tecnicos.filter(tecnico => tecnico.estado === 'disponible').length },
		servicios: datos.servicios.slice(0, 5), tecnicos };
}
