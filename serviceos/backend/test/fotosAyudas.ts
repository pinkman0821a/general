import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { cookies } from './serviciosAyudas';
import { imagenes, prepararComprobante } from './comprobanteAyudas';
import type { fotoPublica } from '../src/services/fotosConsulta';

export { prepararComprobante as prepararFotos, imagenes };
export function cuerpoFotos(cantidad = 1, mime: keyof typeof imagenes = 'image/jpeg', bytes = imagenes[mime], eliminar: number[] = []) {
	const body = new FormData();
	for (let i = 0; i < cantidad; i++) body.append('archivos', new File([bytes], `foto-${i}.jpg`, { type: mime }));
	if (eliminar.length) body.append('eliminar', JSON.stringify(eliminar));
	return body;
}
export function fotos(method: string, id: number, fotoId?: number, body?: FormData, cookie = cookies.coordinador, lote?: string) {
	return SELF.fetch(`https://example.com/api/servicios/${id}/fotos${fotoId === undefined ? '' : `/${fotoId}`}`, {
		method, headers: { Cookie: cookie, ...(lote ? { 'Idempotency-Key': lote } : {}) }, body,
	});
}
export async function listaFotos(id: number, cookie?: string) {
	const respuesta = await fotos('GET', id, undefined, undefined, cookie);
	if (respuesta.status !== 200) throw new Error(`Listado falló: ${respuesta.status}`);
	return (await respuesta.json() as { fotos: ReturnType<typeof fotoPublica>[] }).fotos;
}
export async function keysFotos(id: number) {
	return (await env.DB.prepare('SELECT r2_key FROM servicio_fotos WHERE servicio_id = ? ORDER BY orden, id').bind(id).all<{ r2_key: string }>()).results.map(f => f.r2_key);
}
