import { detalleServicio } from './serviciosService';
import { admiteComprobante, ErrorServicio, respuestaServicio, type ServicioDb } from './serviciosValidacion';
import { formatosComprobante, leerComprobante } from './comprobanteArchivo';

export async function servicioConComprobante(env: Env, id: number) {
	const servicio = await detalleServicio(env, id);
	if (!servicio) throw new ErrorServicio('Servicio no encontrado', 404);
	if (!admiteComprobante(servicio.tipo)) throw new ErrorServicio('Este tipo de servicio no admite comprobante de pago', 400);
	return servicio;
}

async function limpiarObjeto(env: Env, key: string) {
	try { await env.COMPROBANTES.delete(key); return true; }
	catch { console.error('No se pudo limpiar un objeto de comprobante en R2'); return false; }
}

export async function subirComprobante(request: Request, env: Env, actual: ServicioDb) {
	const { archivo, nombre, mime, extension } = await leerComprobante(request);
	const key = `servicios/${actual.id}/comprobantes/${crypto.randomUUID()}.${extension}`;
	await env.COMPROBANTES.put(key, await archivo.arrayBuffer(), { httpMetadata: { contentType: mime } });
	let servicio: ServicioDb | null;
	let escrituraIniciada = false;
	try {
		// Evita pisar otro reemplazo o una edición concurrente a un tipo que no admite comprobante.
		const escritura = env.DB.prepare(`UPDATE servicios SET comprobante_key = ?, comprobante_nombre = ?,
			comprobante_mime = ?, comprobante_size = ?, comprobante_updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND comprobante_key IS ? AND tipo IN ('servicio_presencial', 'servicio_remoto') RETURNING *`)
			.bind(key, nombre, mime, archivo.size, actual.id, actual.comprobante_key ?? null);
		escrituraIniciada = true;
		servicio = await escritura.first<ServicioDb>();
		if (!servicio) throw new ErrorServicio('El servicio o comprobante cambió durante la subida. Actualiza el detalle y reintenta.', 409);
	} catch (causa) {
		if (escrituraIniciada) {
			// D1 puede confirmar la escritura y perder la respuesta: no borrar evidencia referenciada.
			try { servicio = await detalleServicio(env, actual.id); }
			catch { throw new ErrorServicio('No se pudo confirmar el comprobante. Actualiza el detalle; se conservó el archivo para evitar una referencia rota.', 500); }
			if (servicio?.comprobante_key !== key) {
				await limpiarObjeto(env, key);
				throw causa;
			}
		} else {
			await limpiarObjeto(env, key);
			throw causa;
		}
	}
	const limpio = !actual.comprobante_key || await limpiarObjeto(env, actual.comprobante_key);
	return { status: 'ok', servicio: respuestaServicio(servicio, 'coordinador', true),
		...(!limpio ? { aviso: 'Nuevo comprobante guardado. La limpieza del archivo anterior quedó pendiente en almacenamiento.' } : {}) };
}

export async function eliminarComprobante(env: Env, actual: ServicioDb) {
	const servicio = await env.DB.prepare(`UPDATE servicios SET comprobante_key = NULL, comprobante_nombre = NULL,
		comprobante_mime = NULL, comprobante_size = NULL, comprobante_updated_at = NULL
		WHERE id = ? AND comprobante_key IS ? AND tipo IN ('servicio_presencial', 'servicio_remoto') RETURNING *`)
		.bind(actual.id, actual.comprobante_key ?? null).first<ServicioDb>();
	if (!servicio) throw new ErrorServicio('El servicio o comprobante cambió. Actualiza el detalle y reintenta.', 409);
	const limpio = !actual.comprobante_key || await limpiarObjeto(env, actual.comprobante_key);
	return { status: 'ok', servicio: respuestaServicio(servicio, 'coordinador', true),
		...(!limpio ? { aviso: 'El comprobante fue retirado del servicio. La limpieza del archivo quedó pendiente en almacenamiento.' } : {}) };
}

export async function verComprobante(env: Env, servicio: ServicioDb) {
	if (!servicio.comprobante_key) throw new ErrorServicio('El servicio no tiene comprobante de pago', 404);
	const objeto = await env.COMPROBANTES.get(servicio.comprobante_key);
	if (!objeto) throw new ErrorServicio('No se encontró el archivo del comprobante', 404);
	const mime = servicio.comprobante_mime;
	if (!mime || !Object.hasOwn(formatosComprobante, mime)) throw new ErrorServicio('El formato del comprobante no es válido');
	return new Response(objeto.body, { headers: {
		'Content-Type': mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
		'Content-Disposition': 'inline', 'Content-Length': String(objeto.size),
	} });
}
