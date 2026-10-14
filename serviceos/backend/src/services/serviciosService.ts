import type { UsuarioSesion } from './sessionService';
import { filtrosServicios } from './serviciosFiltros';
import { comprobarTrabajo, normalizarTrabajo } from './servicioTrabajo';
import { camposServicio, ErrorServicio, ErrorSobrecarga, esPresencial, respuestaServicio, type DatosServicio, type ServicioDb, type EstadoServicio } from './serviciosValidacion';

export function detalleServicio(env: Env, id: number) {
	return env.DB.prepare('SELECT * FROM servicios WHERE id = ?').bind(id).first<ServicioDb>();
}
export async function listarServicios(env: Env, parametros: URLSearchParams, usuario: UsuarioSesion) {
	const { where, valores } = filtrosServicios(parametros, usuario);
	const resultado = await env.DB.prepare(`SELECT * FROM servicios ${where} ORDER BY fecha_programada ASC, id ASC`)
		.bind(...valores).all<ServicioDb>();
	return resultado.results.map(servicio => respuestaServicio(servicio));
}

// La condición se evalúa en la misma escritura para evitar una asignación tras una ausencia o baja concurrente.
const asignacionPermitida = `EXISTS (SELECT 1 FROM usuarios WHERE id = ? AND rol = 'tecnico' AND activo = 1)
	AND NOT EXISTS (SELECT 1 FROM tecnico_indisponibilidades WHERE tecnico_id = ? AND fecha = ?)`;

async function comprobarAsignacion(env: Env, datos: DatosServicio) {
	const tecnico = await env.DB.prepare('SELECT rol, activo FROM usuarios WHERE id = ?').bind(datos.tecnico_id)
		.first<{ rol: string; activo: number }>();
	if (!tecnico) throw new ErrorServicio('Técnico no encontrado', 404);
	if (tecnico.rol !== 'tecnico' || tecnico.activo !== 1) throw new ErrorServicio('La asignación requiere un técnico activo');
	const ausencia = await env.DB.prepare('SELECT id FROM tecnico_indisponibilidades WHERE tecnico_id = ? AND fecha = ?')
		.bind(datos.tecnico_id, datos.fecha_programada).first();
	if (ausencia) throw new ErrorServicio('Técnico no disponible ese día', 409);
}

const otrosPresenciales = `SELECT id FROM servicios WHERE tecnico_id = ? AND fecha_programada = ?
	AND tipo IN ('garantia', 'servicio_presencial', 'instalacion') AND id != ?`;

async function comprobarSobrecarga(env: Env, datos: DatosServicio, id: number) {
	const fila = await env.DB.prepare(`SELECT count(*) AS cantidad FROM (${otrosPresenciales})`)
		.bind(datos.tecnico_id, datos.fecha_programada, id).first<{ cantidad: number }>();
	if (fila && fila.cantidad > 0) throw new ErrorSobrecarga(fila.cantidad);
}

export async function guardarServicio(env: Env, datos: DatosServicio, actual?: ServicioDb, confirmarSobrecarga = false) {
	const cambiaAgenda = !actual || actual.tecnico_id !== datos.tecnico_id
		|| actual.fecha_programada !== datos.fecha_programada || actual.tipo !== datos.tipo;
	if (cambiaAgenda) await comprobarAsignacion(env, datos);
	const introducePresencial = esPresencial(datos.tipo) && (!actual || !esPresencial(actual.tipo)
		|| actual.tecnico_id !== datos.tecnico_id || actual.fecha_programada !== datos.fecha_programada);
	const requiereAdvertencia = introducePresencial && !confirmarSobrecarga;
	if (requiereAdvertencia) await comprobarSobrecarga(env, datos, actual?.id ?? 0);
	const valores = camposServicio.map((campo) => datos[campo]);
	let guardia = cambiaAgenda ? asignacionPermitida : '1 = 1';
	const parametrosGuardia = cambiaAgenda ? [datos.tecnico_id, datos.tecnico_id, datos.fecha_programada] : [];
	// Revisa tambien en la escritura sin UNIQUE ni locks: las operaciones confirmadas omiten solo esta advertencia.
	if (requiereAdvertencia) {
		guardia += ` AND NOT EXISTS (${otrosPresenciales})`;
		parametrosGuardia.push(datos.tecnico_id, datos.fecha_programada, actual?.id ?? 0);
	}
	const sql = actual
		? `UPDATE servicios SET ${camposServicio.map((campo) => `${campo} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND ${guardia} RETURNING *`
		: `INSERT INTO servicios (${camposServicio.join(', ')}) SELECT ${camposServicio.map(() => '?').join(', ')}
			WHERE ${guardia} RETURNING *`;
	const servicio = await env.DB.prepare(sql).bind(...valores, ...(actual ? [actual.id] : []), ...parametrosGuardia).first<ServicioDb>();
	if (!servicio) {
		if (cambiaAgenda) await comprobarAsignacion(env, datos);
		if (requiereAdvertencia) await comprobarSobrecarga(env, datos, actual?.id ?? 0);
		throw new ErrorServicio('La asignacion dejo de estar disponible', 409);
	}
	return servicio;
}

export async function guardarEstadoServicio(env: Env, id: number, estado: EstadoServicio, usuario: UsuarioSesion, body: Record<string, unknown> = {}) {
	const actual = await detalleServicio(env, id);
	if (!actual || (usuario.rol === 'tecnico' && actual.tecnico_id !== usuario.id)) throw new ErrorServicio('Servicio no accesible', 403);
	const trabajo = normalizarTrabajo('trabajo_realizado' in body ? body.trabajo_realizado : actual.trabajo_realizado);
	comprobarTrabajo(actual.tipo, estado, trabajo);
	// El guardado verifica propiedad y tipo en la misma escritura ante cambios administrativos concurrentes.
	const servicio = await env.DB.prepare(`UPDATE servicios SET estado = ?, trabajo_realizado = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND tipo = ? AND tecnico_id = ? RETURNING *`)
		.bind(estado, trabajo, id, actual.tipo, actual.tecnico_id).first<ServicioDb>();
	if (!servicio) throw new ErrorServicio('Servicio no accesible', 403);
	return servicio;
}
