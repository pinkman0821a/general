import { consultarFotos } from './fotosConsulta';
import { detalleServicio } from './serviciosService';
import { ErrorServicio, type ServicioDb } from './serviciosValidacion';

type Copia = { key: string; bytes: ArrayBuffer; httpMetadata: R2HTTPMetadata; customMetadata: Record<string, string> };

async function restaurar(env: Env, id: number, copias: Copia[]) {
	// No reponer objetos que otra operación ya haya retirado de D1.
	const servicio = await detalleServicio(env, id);
	if (!servicio) return;
	const fotos = await consultarFotos(env, id);
	const referenciadas = new Set([servicio.comprobante_key, ...fotos.map(foto => foto.r2_key)]);
	for (const copia of copias) {
		if (referenciadas.has(copia.key)) await env.COMPROBANTES.put(copia.key, copia.bytes,
			{ httpMetadata: copia.httpMetadata, customMetadata: copia.customMetadata });
	}
}

export async function eliminarServicio(env: Env, actual: ServicioDb) {
	const fotos = await consultarFotos(env, actual.id);
	const keys = [...new Set([...fotos.map(foto => foto.r2_key), ...(actual.comprobante_key ? [actual.comprobante_key] : [])])];
	const copias: Copia[] = [];
	// Como máximo 5 fotos y un comprobante de 5 MB. No borrar nada hasta completar la lectura.
	for (const key of keys) {
		const objeto = await env.COMPROBANTES.get(key);
		if (objeto) copias.push({ key, bytes: await objeto.arrayBuffer(),
			httpMetadata: objeto.httpMetadata ?? {}, customMetadata: objeto.customMetadata ?? {} });
	}
	let borradoD1Iniciado = false;
	try {
		for (const key of keys) await env.COMPROBANTES.delete(key);
		// CAS de archivos: no borrar un upload que llegó después de tomar la copia.
		const coincide = fotos.length ? `AND NOT EXISTS (SELECT 1 FROM servicio_fotos WHERE servicio_id = ?
			AND NOT (${fotos.map(() => '(id = ? AND r2_key = ?)').join(' OR ')}))` : '';
		const sentencia = env.DB.prepare(`DELETE FROM servicios WHERE id = ? AND comprobante_key IS ?
			AND (SELECT COUNT(*) FROM servicio_fotos WHERE servicio_id = ?) = ? ${coincide} RETURNING id`)
			.bind(actual.id, actual.comprobante_key ?? null, actual.id, fotos.length,
				...(fotos.length ? [actual.id, ...fotos.flatMap(foto => [foto.id, foto.r2_key])] : []));
		borradoD1Iniciado = true;
		const eliminado = await sentencia.first<{ id: number }>();
		if (!eliminado) throw new ErrorServicio('Los archivos del servicio cambiaron. Actualiza el detalle y reintenta.', 409);
	} catch (causa) {
		try {
			// Una respuesta D1 perdida puede ocultar un DELETE confirmado.
			if (borradoD1Iniciado && !await detalleServicio(env, actual.id)) return;
			await restaurar(env, actual.id, copias);
		} catch {
			throw new ErrorServicio('No se pudo confirmar o restaurar la eliminación. Requiere revisión del almacenamiento antes de reintentar.', 500);
		}
		if (causa instanceof ErrorServicio) throw causa;
		throw new ErrorServicio('No se pudo eliminar el servicio. Se conservaron sus datos y se restauraron sus archivos. Reintenta.', 500);
	}
}
