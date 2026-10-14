import { ErrorServicio } from './serviciosValidacion';
import { formatosFoto } from './fotosArchivo';

export type FotoDb = { id: number; servicio_id: number; r2_key: string; nombre_original: string | null;
	mime: string; size: number; orden: number; created_at: string; lote: string; indice_lote: number };
export function fotoPublica(foto: FotoDb) {
	return { id: foto.id, nombre_original: foto.nombre_original, mime: foto.mime, size: foto.size, orden: foto.orden, created_at: foto.created_at };
}
export async function consultarFotos(env: Env, servicioId: number) {
	return (await env.DB.prepare('SELECT * FROM servicio_fotos WHERE servicio_id = ? ORDER BY orden ASC, id ASC').bind(servicioId).all<FotoDb>()).results;
}
export async function fotoServicio(env: Env, servicioId: number, fotoId: number) {
	const foto = await env.DB.prepare('SELECT * FROM servicio_fotos WHERE servicio_id = ? AND id = ?').bind(servicioId, fotoId).first<FotoDb>();
	if (!foto) throw new ErrorServicio('Foto no encontrada', 404);
	return foto;
}
export async function verFoto(env: Env, foto: FotoDb) {
	const objeto = await env.COMPROBANTES.get(foto.r2_key);
	if (!objeto) throw new ErrorServicio('No se encontró el archivo de la foto', 404);
	if (!Object.hasOwn(formatosFoto, foto.mime)) throw new ErrorServicio('Formato de foto inválido');
	return new Response(objeto.body, { headers: { 'Content-Type': foto.mime, 'Content-Length': String(objeto.size),
		'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
