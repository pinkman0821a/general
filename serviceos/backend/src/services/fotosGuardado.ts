import { consultarFotos, fotoPublica, type FotoDb } from './fotosConsulta';
import { leerFotos, maximoFotosMensaje } from './fotosArchivo';
import { ErrorServicio } from './serviciosValidacion';

async function limpiarFotos(env: Env, keys: string[]) {
	if (!keys.length) return true;
	try { await env.COMPROBANTES.delete(keys); return true; }
	catch { console.error('Limpieza de fotos de servicio pendiente en R2'); return false; }
}

export async function guardarFotos(request: Request, env: Env, servicioId: number) {
	const { fotos, eliminar, lote } = await leerFotos(request);
	const anteriores = await consultarFotos(env, servicioId);
	const previasLote = anteriores.filter(foto => foto.lote === lote);
	if (previasLote.length) {
		if (previasLote.length !== fotos.length || previasLote.some(foto => {
			const nueva = fotos[foto.indice_lote];
			return !nueva || nueva.mime !== foto.mime || nueva.archivo.size !== foto.size || nueva.nombre !== foto.nombre_original;
		})) throw new ErrorServicio('Este identificador corresponde a otra selección de fotos', 409);
		return { fotos: anteriores.map(fotoPublica) };
	}
	if (anteriores.filter(foto => !eliminar.includes(foto.id)).length + fotos.length > 5) throw new ErrorServicio(maximoFotosMensaje);
	if (eliminar.length) {
		const ajenas = await env.DB.prepare(`SELECT id FROM servicio_fotos WHERE id IN (${eliminar.map(() => '?').join(',')}) AND servicio_id != ?`)
			.bind(...eliminar, servicioId).first();
		if (ajenas) throw new ErrorServicio('Foto ajena al servicio', 403);
	}
	const nuevas = fotos.map((foto, indice) => ({ ...foto, indice, key: `servicios/${servicioId}/fotos/${crypto.randomUUID()}.${foto.extension}` }));
	const subidas: string[] = [];
	try {
		for (const foto of nuevas) {
			subidas.push(foto.key);
			await env.COMPROBANTES.put(foto.key, await foto.archivo.arrayBuffer(), { httpMetadata: { contentType: foto.mime } });
		}
	} catch {
		const limpio = await limpiarFotos(env, subidas);
		throw new ErrorServicio(`No se pudieron subir las fotos.${limpio ? ' No se modificaron las fotos existentes.' : ' La limpieza del intento quedó pendiente en almacenamiento.'}`, 500);
	}
	const escrituras = eliminar.map(id => env.DB.prepare('DELETE FROM servicio_fotos WHERE servicio_id = ? AND id = ? RETURNING *').bind(servicioId, id));
	for (const foto of nuevas) escrituras.push(env.DB.prepare(`INSERT INTO servicio_fotos
		(servicio_id, r2_key, nombre_original, mime, size, orden, lote, indice_lote)
		VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(orden), -1) + 1 FROM servicio_fotos WHERE servicio_id = ?), ?, ?) RETURNING *`)
		.bind(servicioId, foto.key, foto.nombre, foto.mime, foto.archivo.size, servicioId, lote, foto.indice));
	let retiradas: FotoDb[];
	try {
		const resultados = await env.DB.batch<FotoDb>(escrituras);
		retiradas = resultados.slice(0, eliminar.length).flatMap(resultado => resultado.results);
	} catch (causa) {
		// Una respuesta perdida puede ocultar un commit: comprobar referencias antes de borrar R2.
		let actuales: FotoDb[];
		try { actuales = await consultarFotos(env, servicioId); }
		catch { throw new ErrorServicio('No se pudo confirmar el guardado de fotos. Reintenta; se conservaron los archivos para evitar referencias rotas.', 500); }
		const confirmado = nuevas.length > 0 && actuales.filter(foto => foto.lote === lote).length === nuevas.length;
		const descartadas = subidas.filter(key => !actuales.some(foto => foto.r2_key === key));
		if (confirmado) descartadas.push(...anteriores.filter(foto => eliminar.includes(foto.id) && !actuales.some(actual => actual.id === foto.id)).map(foto => foto.r2_key));
		const limpio = await limpiarFotos(env, descartadas);
		if (confirmado) return { fotos: actuales.map(fotoPublica), ...(!limpio ? { aviso: 'Fotos guardadas. La limpieza quedó pendiente en almacenamiento.' } : {}) };
		if (causa instanceof Error && causa.message.includes('maximo_fotos_servicio')) throw new ErrorServicio(maximoFotosMensaje, 409);
		throw new ErrorServicio(`No se pudieron guardar las fotos. Reintenta sin volver a crear el servicio.${limpio ? '' : ' La limpieza del intento quedó pendiente en almacenamiento.'}`, 500);
	}
	const limpio = await limpiarFotos(env, retiradas.map(foto => foto.r2_key));
	return { fotos: (await consultarFotos(env, servicioId)).map(fotoPublica),
		...(!limpio ? { aviso: 'Fotos guardadas. La limpieza de fotos retiradas quedó pendiente en almacenamiento.' } : {}) };
}

export async function eliminarFoto(env: Env, servicioId: number, fotoId: number) {
	const foto = await env.DB.prepare('DELETE FROM servicio_fotos WHERE servicio_id = ? AND id = ? RETURNING *').bind(servicioId, fotoId).first<FotoDb>();
	if (!foto) throw new ErrorServicio('Foto no encontrada', 404);
	const limpio = await limpiarFotos(env, [foto.r2_key]);
	return { ...(!limpio ? { aviso: 'Foto retirada. La limpieza del archivo quedó pendiente en almacenamiento.' } : {}) };
}
