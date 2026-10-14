import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { cookies, crear, detalle, error, migrar, pedir } from './serviciosAyudas';
import { cuerpoFotos, fotos, keysFotos, listaFotos, prepararFotos, imagenes } from './fotosAyudas';
import { comprobante, multipart, referencia } from './comprobanteAyudas';

beforeAll(migrar);
beforeEach(prepararFotos);

it.each(['garantia', 'servicio_presencial', 'servicio_remoto', 'instalacion', 'instalacion_remota'])('crear %s con cero o una foto opcional', async tipo => {
	const remoto = tipo.endsWith('remoto') || tipo.endsWith('remota');
	const creado = await crear({ tipo, ...(remoto ? { ciudad: null, direccion: null } : {}),
		...(!tipo.startsWith('servicio_') ? { valor_servicio: null } : {}) });
	expect(await listaFotos(creado.id)).toEqual([]);
	expect((await fotos('POST', creado.id, undefined, cuerpoFotos())).status).toBe(200);
	expect(await listaFotos(creado.id)).toHaveLength(1);
});

it('cinco fotos, orden estable, sexta rechazada y keys generadas nunca expuestas', async () => {
	const creado = await crear();
	const respuesta = await fotos('POST', creado.id, undefined, cuerpoFotos(5));
	expect(respuesta.status).toBe(200);
	const filas = await listaFotos(creado.id);
	expect(filas.map(f => f.orden)).toEqual([0, 1, 2, 3, 4]);
	expect(Object.keys(filas[0]).sort()).toEqual(['id', 'nombre_original', 'mime', 'size', 'orden', 'created_at'].sort());
	expect(JSON.stringify(filas)).not.toMatch(/r2_key|comprobante|lote|servicio_id/);
	const keys = await keysFotos(creado.id);
	for (const key of keys) expect(key).toMatch(new RegExp(`^servicios/${creado.id}/fotos/[a-f0-9-]{36}\\.jpg$`));
	expect(keys.some(key => key.includes('foto-'))).toBe(false);
	await error(await fotos('POST', creado.id, undefined, cuerpoFotos()), 400);
	await error(await fotos('POST', creado.id, undefined, cuerpoFotos(6)), 400);
	expect(await listaFotos(creado.id)).toEqual(filas);
	expect((await env.COMPROBANTES.list()).objects).toHaveLength(5);
});

it.each(Object.keys(imagenes) as (keyof typeof imagenes)[])('acepta firma real %s y devuelve headers privados y bytes originales', async mime => {
	const creado = await crear();
	await fotos('POST', creado.id, undefined, cuerpoFotos(1, mime));
	const [foto] = await listaFotos(creado.id);
	const respuesta = await fotos('GET', creado.id, foto.id);
	expect(respuesta.status).toBe(200);
	expect(respuesta.headers.get('Content-Type')).toBe(mime);
	expect(respuesta.headers.get('Cache-Control')).toBe('private, no-store');
	expect(respuesta.headers.get('X-Content-Type-Options')).toBe('nosniff');
	expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(imagenes[mime]);
});

it.each([
	['vacío', 'image/jpeg', new Uint8Array(), 400],
	['grande', 'image/jpeg', new Uint8Array(5 * 1024 * 1024 + 1), 413],
	['MIME', 'application/pdf', imagenes['image/jpeg'], 400],
	['firma', 'image/png', imagenes['image/jpeg'], 400],
	['firma webp', 'image/webp', imagenes['image/png'], 400],
] as const)('rechaza %s sin subir ni registrar fotos', async (_caso, mime, bytes, estado) => {
	const creado = await crear();
	const body = new FormData(); body.append('archivos', new File([bytes], 'foto.jpg', { type: mime }));
	await error(await fotos('POST', creado.id, undefined, body), estado);
	expect(await listaFotos(creado.id)).toEqual([]);
	expect((await env.COMPROBANTES.list()).objects).toHaveLength(0);
});

it('coordinador y técnico asignado ven; técnico no administra ni accede a otro servicio', async () => {
	const propio = await crear(); const ajeno = await crear({ tecnico_id: 3 });
	await fotos('POST', propio.id, undefined, cuerpoFotos()); await fotos('POST', ajeno.id, undefined, cuerpoFotos());
	const [foto] = await listaFotos(propio.id);
	expect((await fotos('GET', propio.id, foto.id, undefined, cookies.tecnico)).status).toBe(200);
	expect(await listaFotos(propio.id, cookies.tecnico)).toHaveLength(1);
	for (const metodo of ['POST', 'DELETE']) await error(await fotos(metodo, propio.id, metodo === 'DELETE' ? foto.id : undefined,
		metodo === 'POST' ? cuerpoFotos() : undefined, cookies.tecnico), 403);
	const [otra] = await listaFotos(ajeno.id);
	await error(await fotos('GET', ajeno.id, undefined, undefined, cookies.tecnico), 403);
	await error(await fotos('GET', ajeno.id, otra.id, undefined, cookies.tecnico), 403);
	await error(await fotos('GET', propio.id, foto.id, undefined, ''), 401);
	await error(await fotos('GET', propio.id, otra.id), 404);
	await error(await fotos('DELETE', propio.id, otra.id), 404);
});

it('eliminar limpia D1/R2 y permite agregar hasta completar cinco', async () => {
	const creado = await crear(); await fotos('POST', creado.id, undefined, cuerpoFotos(5));
	const [foto] = await listaFotos(creado.id); const [key] = await keysFotos(creado.id);
	expect((await fotos('DELETE', creado.id, foto.id)).status).toBe(200);
	expect(await env.COMPROBANTES.head(key)).toBeNull();
	expect(await listaFotos(creado.id)).toHaveLength(4);
	expect((await fotos('POST', creado.id, undefined, cuerpoFotos())).status).toBe(200);
	expect(await listaFotos(creado.id)).toHaveLength(5);
});

it('edición aplica retiros y altas en una transacción; cancelar selección no borra nada', async () => {
	const creado = await crear(); await fotos('POST', creado.id, undefined, cuerpoFotos(5));
	const filas = await listaFotos(creado.id); const keys = await keysFotos(creado.id);
	expect(await listaFotos(creado.id)).toEqual(filas);
	const respuesta = await fotos('POST', creado.id, undefined, cuerpoFotos(2, 'image/png', imagenes['image/png'], filas.slice(0, 2).map(f => f.id)));
	expect(respuesta.status).toBe(200);
	expect(await listaFotos(creado.id)).toHaveLength(5);
	expect(await env.COMPROBANTES.head(keys[0])).toBeNull(); expect(await env.COMPROBANTES.head(keys[1])).toBeNull();
});

it('retry idempotente no duplica un lote tras perder respuesta', async () => {
	const creado = await crear(), lote = crypto.randomUUID();
	await fotos('POST', creado.id, undefined, cuerpoFotos(2), cookies.coordinador, lote);
	expect((await fotos('POST', creado.id, undefined, cuerpoFotos(2), cookies.coordinador, lote)).status).toBe(200);
	expect(await listaFotos(creado.id)).toHaveLength(2);
	expect((await env.COMPROBANTES.list()).objects).toHaveLength(2);
	await error(await fotos('POST', creado.id, undefined, cuerpoFotos(1), cookies.coordinador, lote), 409);
});

it('cambio de tipo conserva fotos y evidencia queda separada del comprobante', async () => {
	const creado = await crear(); await comprobante('PUT', creado.id, multipart());
	const pago = await referencia(creado.id);
	await fotos('POST', creado.id, undefined, cuerpoFotos()); const originales = await listaFotos(creado.id);
	expect(await referencia(creado.id)).toEqual(pago);
	await detalle(await pedir('PATCH', `/${creado.id}`, { tipo: 'instalacion', tipo_falla: null, valor_servicio: null, confirmar_sobrecarga: true }));
	expect(await listaFotos(creado.id)).toEqual(originales);
	expect((await fotos('GET', creado.id, originales[0].id, undefined, cookies.tecnico)).status).toBe(200);
	await error(await comprobante('GET', creado.id, undefined, cookies.tecnico), 403);
	await fotos('DELETE', creado.id, originales[0].id);
	expect(await env.COMPROBANTES.head(pago!.comprobante_key!)).not.toBeNull();
});
