import { camposRecepcion, ErrorTaller } from './tallerValidacion';
import type { AccesorioDb, DatosRecepcion, RecepcionDb } from './tallerValidacion';

const seleccion = `SELECT *, CASE WHEN fecha_entrega IS NULL THEN 'en_taller'
	ELSE 'entregada' END AS estado FROM taller_recepciones`;

export async function detalleTaller(env: Env, id: number) {
	const resultados = await env.DB.batch([
		env.DB.prepare(`${seleccion} WHERE id = ?`).bind(id),
		env.DB.prepare('SELECT * FROM taller_accesorios WHERE recepcion_id = ? ORDER BY id').bind(id),
	]);
	const recepcion = resultados[0].results[0] as RecepcionDb | undefined;
	return recepcion ? { ...recepcion, accesorios: resultados[1].results as AccesorioDb[] } : null;
}

export function listarTaller(env: Env, estado: string | null, buscar: string | null) {
	const condiciones: string[] = [];
	const valores: string[] = [];
	if (estado) condiciones.push(`fecha_entrega IS ${estado === 'en_taller' ? '' : 'NOT '}NULL`);
	if (buscar) {
		const campos = ['cliente_nombre', 'cliente_contacto', 'cliente_telefono', 'maquina_tipo',
			'maquina_marca', 'maquina_modelo', 'maquina_serial'];
		condiciones.push(`(${campos.map((campo) => `${campo} LIKE ? ESCAPE '\\'`).join(' OR ')})`);
		const patron = `%${buscar.replace(/[\\%_]/g, '\\$&')}%`;
		valores.push(...campos.map(() => patron));
	}
	return env.DB.prepare(`${seleccion} ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
		ORDER BY fecha_ingreso DESC, id DESC`).bind(...valores).all<RecepcionDb>();
}

export async function crearRecepcion(env: Env, datos: DatosRecepcion, accesorios: string[]) {
	// MAX(id) se evalúa dentro del mismo batch transaccional, sin escritores intermedios.
	const resultados = await env.DB.batch([
		env.DB.prepare(`INSERT INTO taller_recepciones (${camposRecepcion.join(', ')})
			VALUES (${camposRecepcion.map(() => '?').join(', ')}) RETURNING id`)
			.bind(...camposRecepcion.map((campo) => datos[campo])),
		env.DB.prepare(`INSERT INTO taller_accesorios (recepcion_id, nombre)
			SELECT r.id, j.value FROM taller_recepciones r, json_each(?) j
			WHERE r.id = (SELECT MAX(id) FROM taller_recepciones)`).bind(JSON.stringify(accesorios)),
	]);
	const creada = resultados[0].results[0] as { id: number };
	return detalleTaller(env, creada.id);
}

export async function editarRecepcion(env: Env, id: number, datos: DatosRecepcion, accesorios?: string[]) {
	const sentencias = [env.DB.prepare(`UPDATE taller_recepciones SET
		${camposRecepcion.map((campo) => `${campo} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?`).bind(...camposRecepcion.map((campo) => datos[campo]), id)];
	if (accesorios !== undefined) {
		const nombres = JSON.stringify(accesorios);
		sentencias.push(
			env.DB.prepare(`DELETE FROM taller_accesorios WHERE recepcion_id = ?
				AND nombre NOT IN (SELECT value FROM json_each(?))`).bind(id, nombres),
			env.DB.prepare(`INSERT INTO taller_accesorios (recepcion_id, nombre)
				SELECT ?, value FROM json_each(?) WHERE true
				ON CONFLICT (recepcion_id, nombre) DO UPDATE SET nombre = excluded.nombre`).bind(id, nombres),
		);
	}
	await env.DB.batch(sentencias);
	return detalleTaller(env, id);
}

export async function guardarEntrega(env: Env, id: number, fecha: string, ids: number[]) {
	const lista = JSON.stringify(ids);
	// La pertenencia y la fecha se verifican también dentro de la transacción.
	const condicion = `fecha_ingreso <= ? AND
		(SELECT COUNT(*) FROM taller_accesorios WHERE recepcion_id = ?
		AND id IN (SELECT value FROM json_each(?))) = json_array_length(?)`;
	const resultados = await env.DB.batch([
		env.DB.prepare(`UPDATE taller_recepciones SET fecha_entrega = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND ${condicion}`).bind(fecha, id, fecha, id, lista, lista),
		env.DB.prepare(`UPDATE taller_accesorios
			SET devuelto = CASE WHEN id IN (SELECT value FROM json_each(?)) THEN 1 ELSE 0 END
			WHERE recepcion_id = ? AND EXISTS
			(SELECT 1 FROM taller_recepciones WHERE id = ? AND ${condicion})`)
			.bind(lista, id, id, fecha, id, lista, lista),
	]);
	if (!resultados[0].meta.changes) throw new ErrorTaller('Fecha o accesorios inválidos para esta recepción');
	return detalleTaller(env, id);
}
