import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SELF } from 'cloudflare:test';
import { datos, cookies, crear, detalle, error, migrar, pedir, preparar, remoto } from './serviciosAyudas';

beforeAll(migrar);
beforeEach(preparar);

const invalidos: Record<string, unknown>[] = [
	{ tipo: 'taller' }, { tipo: null }, { estado: 'pendiente' }, { comprobante: 'base64' },
	{ tecnico_id: 0 }, { tecnico_id: '2' }, { tecnico_id: 1 }, { tecnico_id: 4 },
	...['20261015', '2026-1-15', '2026-02-30', '2026-02-29', '1900-02-29', '0000-01-01', '2026-13-01'].map(fecha_programada => ({ fecha_programada })),
	...['cliente_nombre', 'cliente_telefono', 'maquina', 'tipo_falla'].flatMap(campo => ['', ' \t ', null, 2].map(valor => ({ [campo]: valor }))),
	...['ciudad', 'direccion', 'tarjeteria', 'cabezal', 'observaciones'].flatMap(campo => ['', ' \n ', 2].map(valor => ({ [campo]: valor }))),
	{ ciudad: null }, { direccion: null }, { ...remoto, ciudad: 'Bogotá' }, { ...remoto, direccion: 'Carrera' },
	...[null, 0, -1, 1.5, '250000', true].map(valor_servicio => ({ valor_servicio })),
	...['garantia', 'instalacion', 'instalacion_remota'].map(tipo => ({ tipo })),
];
describe('Servicios: validación API', () => {
	it.each(invalidos)('rechaza creación y edición inválida %j sin cambios', async cambios => {
		await error(await pedir('POST', '', { ...datos, ...cambios }), 400);
		const servicio = await crear();
		await error(await pedir('PATCH', `/${servicio.id}`, cambios), 400);
		expect(await detalle(await pedir('GET', `/${servicio.id}`))).toEqual(servicio);
	});
	it.each(['POST', 'PATCH'])('rechaza JSON mal formado y cuerpos vacíos en %s', async method => {
		const servicio = await crear();
		const sufijo = method === 'PATCH' ? `/${servicio.id}` : '';
		for (const body of [{}, [], null]) await error(await pedir(method, sufijo, body), 400);
		await error(await pedir(method, sufijo), 400);
		await error(await SELF.fetch(`https://example.com/api/servicios${sufijo}`, {
			method, headers: { Cookie: cookies.coordinador }, body: '{',
		}), 400);
	});
	it('exige los campos obligatorios y valor para ambos servicios', async () => {
		for (const campo of ['tipo', 'cliente_nombre', 'cliente_telefono', 'fecha_programada', 'tecnico_id', 'maquina', 'tipo_falla', 'valor_servicio']) {
			const body: Record<string, unknown> = { ...datos }; delete body[campo];
			await error(await pedir('POST', '', body), 400);
		}
		await error(await pedir('POST', '', { ...datos, ...remoto, valor_servicio: null }), 400);
	});
	it.each(['cancelado', '', null, 1])('rechaza estado %j', async estado => {
		const servicio = await crear();
		await error(await pedir('PATCH', `/${servicio.id}/estado`, { estado }), 400);
	});
	it.each([{}, { estado: 'realizado', valor_servicio: 1 }, { cliente_nombre: 'Otro' }])('restringe body de estado %j', async body => {
		const servicio = await crear(); await error(await pedir('PATCH', `/${servicio.id}/estado`, body), 400);
	});
	it('rechaza técnico inexistente', async () => { await error(await pedir('POST', '', { ...datos, tecnico_id: 99 }), 404); });
});
