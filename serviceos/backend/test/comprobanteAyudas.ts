import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { cookies, preparar } from './serviciosAyudas';

export const imagenes = {
	'image/jpeg': new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1]),
	'image/png': new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
	'image/webp': new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]),
};
export function multipart(mime = 'image/jpeg', bytes = imagenes['image/jpeg'], nombre = 'pago.jpg') {
	const body = new FormData();
	body.append('archivo', new File([bytes], nombre, { type: mime }));
	return body;
}
export function comprobante(method: string, id: number, body?: BodyInit, cookie = cookies.coordinador) {
	return SELF.fetch(`https://example.com/api/servicios/${id}/comprobante`, {
		method, headers: { Cookie: cookie }, body,
	});
}
export async function prepararComprobante() {
	await preparar();
	const objetos = await env.COMPROBANTES.list();
	if (objetos.objects.length) await env.COMPROBANTES.delete(objetos.objects.map(objeto => objeto.key));
}
export function referencia(id: number) {
	return env.DB.prepare('SELECT comprobante_key, comprobante_nombre, comprobante_mime, comprobante_size FROM servicios WHERE id = ?')
		.bind(id).first<{ comprobante_key: string | null; comprobante_nombre: string | null; comprobante_mime: string | null; comprobante_size: number | null }>();
}
