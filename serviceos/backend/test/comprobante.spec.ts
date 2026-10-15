import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crear, cookies, detalle, error, lista, migrar, pedir, remoto } from './serviciosAyudas';
import { comprobante, imagenes, multipart, prepararComprobante, referencia } from './comprobanteAyudas';

beforeAll(migrar);
beforeEach(prepararComprobante);

describe('Comprobante privado: R2 simulado real y API', () => {
	it.each(Object.keys(imagenes))('coordinador sube y visualiza %s', async mime => {
		const servicio = await crear();
		const bytes = imagenes[mime as keyof typeof imagenes];
		const response = await comprobante('PUT', servicio.id, multipart(mime, bytes, '../../pago.exe'));
		expect(response.status).toBe(200);
		const texto = await response.text();
		expect(texto).not.toContain('comprobante_key'); expect(texto).not.toContain('servicios/');
		expect(JSON.parse(texto).servicio).toMatchObject({ tiene_comprobante: true, comprobante_mime: mime, comprobante_nombre: 'pago.exe', comprobante_size: bytes.length });
		const fila = (await referencia(servicio.id))!;
		expect(fila.comprobante_key).toMatch(new RegExp(`^servicios/${servicio.id}/comprobantes/[a-f0-9-]{36}\\.(jpg|png|webp)$`));
		expect(await env.COMPROBANTES.head(fila.comprobante_key!)).not.toBeNull();
		const imagen = await comprobante('GET', servicio.id);
		expect(imagen.status).toBe(200);
		expect(imagen.headers.get('Content-Type')).toBe(mime);
		expect(imagen.headers.get('Cache-Control')).toBe('private, no-store');
		expect(imagen.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(imagen.headers.get('Content-Disposition')).toBe('inline');
		expect(new Uint8Array(await imagen.arrayBuffer())).toEqual(bytes);
	});
	it('reemplaza sin borrar antes y elimina objeto anterior; DELETE quita referencia y objeto', async () => {
		const servicio = await crear(remoto);
		expect((await comprobante('PUT', servicio.id, multipart())).status).toBe(200);
		const anterior = (await referencia(servicio.id))!.comprobante_key!;
		expect((await comprobante('PUT', servicio.id, multipart('image/png', imagenes['image/png'], 'nuevo.png'))).status).toBe(200);
		const nueva = (await referencia(servicio.id))!.comprobante_key!;
		expect(nueva).not.toBe(anterior);
		expect(await env.COMPROBANTES.head(anterior)).toBeNull(); expect(await env.COMPROBANTES.head(nueva)).not.toBeNull();
		const respuesta = await comprobante('DELETE', servicio.id);
		expect(respuesta.status).toBe(200);
		expect(await respuesta.json()).toMatchObject({ servicio: { tiene_comprobante: false, comprobante_nombre: null } });
		expect(await referencia(servicio.id)).toEqual({ comprobante_key: null, comprobante_nombre: null, comprobante_mime: null, comprobante_size: null });
		expect(await env.COMPROBANTES.head(nueva)).toBeNull();
		await error(await comprobante('GET', servicio.id), 404);
	});
	it.each(['GET', 'PUT', 'DELETE'])('técnico recibe 403 en %s, incluso propio e inexistente', async method => {
		const servicio = await crear(); await comprobante('PUT', servicio.id, multipart());
		for (const id of [servicio.id, 999]) await error(await comprobante(method, id, method === 'PUT' ? multipart() : undefined, cookies.tecnico), 403);
	});
	it.each(['GET', 'PUT', 'DELETE'])('sesión ausente recibe 401 en %s', async method => {
		await error(await comprobante(method, 999, method === 'PUT' ? multipart() : undefined, ''), 401);
	});
	it.each(['GET', 'PUT', 'DELETE'])('servicio inexistente recibe 404 en %s', async method => {
		await error(await comprobante(method, 999, method === 'PUT' ? multipart() : undefined), 404);
	});
	it.each(['garantia', 'instalacion', 'instalacion_remota'])('%s rechaza operaciones y conserva evidencia histórica oculta', async tipo => {
		const servicio = await crear(); await comprobante('PUT', servicio.id, multipart());
		const key = (await referencia(servicio.id))!.comprobante_key;
		const oculto = await detalle(await pedir('PATCH', `/${servicio.id}`, { tipo, valor_servicio: null,
			...(tipo === 'instalacion_remota' ? { ciudad: null, direccion: null } : {}) }));
		expect(Object.keys(oculto).some(campo => campo.includes('comprobante'))).toBe(false);
		for (const method of ['GET', 'PUT', 'DELETE']) await error(await comprobante(method, servicio.id, method === 'PUT' ? multipart() : undefined), 400);
		expect((await referencia(servicio.id))!.comprobante_key).toBe(key);
		expect(await env.COMPROBANTES.head(key!)).not.toBeNull();
		const visible = await detalle(await pedir('PATCH', `/${servicio.id}`, { tipo: 'servicio_presencial', valor_servicio: 250000,
			tipo_falla: 'Falla', ciudad: 'Bogotá', direccion: 'Calle 1' }));
		expect(visible).toHaveProperty('tiene_comprobante', true);
		expect((await comprobante('GET', servicio.id)).status).toBe(200);
		const tecnico = await detalle(await pedir('GET', `/${servicio.id}`, undefined, cookies.tecnico));
		expect(Object.keys(tecnico).some(campo => campo.includes('comprobante'))).toBe(false);
	});
	it('listados y mutaciones del técnico no filtran presencia, metadatos ni key', async () => {
		const servicio = await crear(); await comprobante('PUT', servicio.id, multipart());
		for (const cookie of [cookies.coordinador, cookies.tecnico]) {
			const listado = await lista('', cookie);
			expect(Object.keys(listado[0]).some(campo => campo.includes('comprobante'))).toBe(false);
		}
		const actualizado = await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }, cookies.tecnico));
		expect(Object.keys(actualizado).some(campo => campo.includes('comprobante'))).toBe(false);
		const coordinador = await detalle(await pedir('GET', `/${servicio.id}`));
		expect(coordinador).toHaveProperty('tiene_comprobante', true); expect(coordinador).not.toHaveProperty('comprobante_key');
		await error(await pedir('PATCH', `/${servicio.id}`, { comprobante_key: 'arbitraria' }), 400);
	});
	it('rechaza subida inválida sin afectar el comprobante anterior', async () => {
		const servicio = await crear(); await comprobante('PUT', servicio.id, multipart());
		const original = await referencia(servicio.id);
		const grande = new Uint8Array(5 * 1024 * 1024 + 1); grande.set(imagenes['image/jpeg']);
		const vacio = new FormData();
		const texto = new FormData(); texto.append('archivo', 'No es archivo');
		for (const [body, status] of [
			[multipart('image/jpeg', grande), 413], [multipart('application/pdf'), 400], [multipart('image/jpeg', new Uint8Array()), 400],
			[multipart('image/png', imagenes['image/jpeg']), 400], [vacio, 400], [texto, 400], ['No es multipart', 400],
		] as const) await error(await comprobante('PUT', servicio.id, body), status);
		const doble = multipart(); doble.append('archivo', new File([imagenes['image/jpeg']], 'otro.jpg', { type: 'image/jpeg' }));
		await error(await comprobante('PUT', servicio.id, doble), 400);
		const malformado = await import('cloudflare:test');
		await error(await malformado.SELF.fetch(`https://example.com/api/servicios/${servicio.id}/comprobante`, {
			method: 'PUT', headers: { Cookie: cookies.coordinador, 'Content-Type': 'multipart/form-data; boundary=ausente' }, body: 'inválido',
		}), 400);
		expect(await referencia(servicio.id)).toEqual(original);
		expect((await env.COMPROBANTES.list()).objects.length).toBe(1);
	});
});
