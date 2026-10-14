import type { UsuarioSesion } from './sessionService';
import { ErrorServicio, type ServicioDb } from './serviciosValidacion';
import { consultarResumenFinanzasMes } from './finanzasConsulta';

export function mesComisiones(parametros: URLSearchParams) {
	const mes = parametros.get('mes');
	if (!mes || parametros.getAll('mes').length !== 1 || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
		throw new ErrorServicio('Mes inválido. Usa YYYY-MM.');
	}
	return mes;
}

export type ServicioComision = ServicioDb & { tecnico_nombre: string };

export async function consultarComisiones(env: Env, mes: string, usuario: UsuarioSesion) {
	const filas = await env.DB.prepare(`SELECT s.*, u.nombre AS tecnico_nombre FROM servicios s
		JOIN usuarios u ON u.id = s.tecnico_id WHERE s.fecha_programada BETWEEN ? AND ?
		AND s.estado = 'realizado' AND s.tipo IN ('servicio_presencial', 'servicio_remoto', 'instalacion', 'instalacion_remota')
		${usuario.rol === 'tecnico' ? 'AND s.tecnico_id = ?' : ''}
		ORDER BY s.fecha_programada ASC, s.id ASC`)
		.bind(`${mes}-01`, `${mes}-31`, ...(usuario.rol === 'tecnico' ? [usuario.id] : [])).all<ServicioComision>();
	return filas.results;
}

export async function consultarPagoMes(env: Env, mes: string) {
	return (await consultarResumenFinanzasMes(env, mes)).pago_tecnicos;
}
