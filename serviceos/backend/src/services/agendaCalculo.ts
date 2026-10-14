import { esPresencial, type ServicioDb } from './serviciosValidacion';

export type TecnicoAgenda = { id: number; nombre: string; activo: number };
export type ServicioAgenda = Pick<ServicioDb, 'id' | 'tecnico_id' | 'fecha_programada' | 'tipo' | 'estado' | 'cliente_nombre' | 'maquina' | 'ciudad'> & { tecnico_nombre: string };
export type BloqueoAgenda = { tecnico_id: number; fecha: string; motivo: string | null };

export function estadoTecnicoDia(tecnico: TecnicoAgenda, servicios: ServicioAgenda[], bloqueo?: BloqueoAgenda) {
	const presenciales = servicios.filter(servicio => esPresencial(servicio.tipo));
	const remotos = servicios.filter(servicio => !esPresencial(servicio.tipo));
	const estado = bloqueo ? 'no_disponible' : presenciales.length >= 2 ? 'sobrecarga'
		: presenciales.length === 1 ? 'programado' : 'disponible';
	return { ...tecnico, estado, motivo: bloqueo?.motivo ?? null, presenciales, remotos };
}

export function construirDiaAgenda(fecha: string, tecnicos: TecnicoAgenda[], servicios: ServicioAgenda[], bloqueos: BloqueoAgenda[]) {
	const delDia = servicios.filter(servicio => servicio.fecha_programada === fecha);
	const porTecnico = new Map<number, ServicioAgenda[]>();
	for (const servicio of delDia) {
		const grupo = porTecnico.get(servicio.tecnico_id) ?? [];
		grupo.push(servicio); porTecnico.set(servicio.tecnico_id, grupo);
	}
	const manuales = new Map(bloqueos.filter(bloqueo => bloqueo.fecha === fecha).map(b => [b.tecnico_id, b]));
	return { fecha, tecnicos: tecnicos.filter(tecnico => tecnico.activo === 1 || porTecnico.has(tecnico.id))
		.map(tecnico => estadoTecnicoDia(tecnico, porTecnico.get(tecnico.id) ?? [], manuales.get(tecnico.id))) };
}
