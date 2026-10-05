import { SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { camposOpcionales, camposRequeridos } from '../src/services/tallerValidacion';
import { crearTaller, detalleRespuesta, errorTaller, fechasInvalidas, ingreso,
	migrarTaller, prepararTaller, solicitarTaller } from './tallerAyudas';
import type { Cookies, Detalle } from './tallerAyudas';

let cookies: Cookies;
let recepcion: Detalle;
beforeAll(migrarTaller);
beforeEach(async () => {
	cookies = await prepararTaller();
	recepcion = await crearTaller(cookies.coordinador, { accesorios: ['Cable', 'USB'] });
});

async function rechazarDatos(body: Record<string, unknown>) {
	await errorTaller(await solicitarTaller(cookies.coordinador, 'POST', '', { ...ingreso, ...body }), 400);
	await errorTaller(await solicitarTaller(cookies.coordinador, 'PATCH', `/${recepcion.id}`, body), 400);
}

describe('Taller: validaciones de rutas y cuerpos', () => {
	it.each(['abc', '0', '-1', '1.5', '1e2', '9007199254740992'])(
		'rechaza ID %s', async (id) => {
			for (const [method, sufijo] of [['GET', ''], ['PATCH', ''], ['PUT', '/entrega']]) {
				await errorTaller(await solicitarTaller(cookies.coordinador, method, `/${id}${sufijo}`,
					method === 'GET' ? undefined : {}), 400);
			}
		},
	);
	it('devuelve 404 para recepción inexistente', async () => {
		for (const [method, sufijo] of [['GET', ''], ['PATCH', ''], ['PUT', '/entrega']]) {
			await errorTaller(await solicitarTaller(cookies.coordinador, method, `/99999${sufijo}`,
				method === 'GET' ? undefined : {}), 404);
		}
	});
	it.each([null, [], 'texto', 123, true])('rechaza cuerpo no objeto %j', async (body) => {
		for (const [method, sufijo] of [['POST', ''], ['PATCH', `/${recepcion.id}`], ['PUT', `/${recepcion.id}/entrega`]]) {
			await errorTaller(await solicitarTaller(cookies.coordinador, method, sufijo, body), 400);
		}
	});
	it('rechaza JSON mal formado y cuerpos vacíos en todas las escrituras', async () => {
		for (const [method, sufijo] of [['POST', ''], ['PATCH', `/${recepcion.id}`], ['PUT', `/${recepcion.id}/entrega`]]) {
			await errorTaller(await SELF.fetch(`https://example.com/api/taller${sufijo}`, {
				method, headers: { Cookie: cookies.coordinador }, body: '{',
			}), 400);
			await errorTaller(await solicitarTaller(cookies.coordinador, method, sufijo, {}), 400);
		}
	});
	it.each(['?estado=otro', '?estado=', '?estado=EN_TALLER', '?estado=en_taller&estado=entregada',
		'?buscar=', '?buscar=%20', '?buscar=a&buscar=b', '?desde=2026-10-01'])(
		'rechaza filtros inválidos %s', async (filtro) => {
			await errorTaller(await solicitarTaller(cookies.tecnico, 'GET', filtro), 400);
		},
	);
	it.each(['fecha_entrega', 'estado', 'id', 'tecnico_id', 'created_at', 'updated_at', 'otro'])(
		'no permite alterar campo protegido o desconocido %s', async (campo) => {
			await rechazarDatos({ [campo]: '2026-10-14' });
			await errorTaller(await solicitarTaller(cookies.tecnico, 'PUT', `/${recepcion.id}/entrega`, {
				fecha_entrega: '2026-10-14', accesorios_devueltos: [], cliente_nombre: 'Intrusión',
			}), 400);
		},
	);
});

describe('Taller: validaciones de ingreso', () => {
	it.each(['fecha_ingreso', ...camposRequeridos, 'accesorios'])(
		'exige campo %s al crear', async (campo) => {
			const body: Record<string, unknown> = { ...ingreso };
			delete body[campo];
			await errorTaller(await solicitarTaller(cookies.coordinador, 'POST', '', body), 400);
		},
	);
	it.each([...camposRequeridos, ...camposOpcionales])('valida texto %s en creación y edición', async (campo) => {
		for (const valor of ['', ' ', '\t\n', '\u00a0', '\ufeff', 12, true, [], {}]) {
			await rechazarDatos({ [campo]: valor });
		}
		if ((camposRequeridos as readonly string[]).includes(campo)) await rechazarDatos({ [campo]: null });
	});
	it.each(fechasInvalidas)('rechaza ingreso imposible o mal formado %j', async (fecha_ingreso) => {
		await rechazarDatos({ fecha_ingreso });
	});
	it.each([null, 20261009, true, [], {}])('rechaza fecha no textual %j', async (fecha_ingreso) => {
		await rechazarDatos({ fecha_ingreso });
	});
	it.each(['2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31'])(
		'acepta fecha real %s', async (fecha) => {
			const creada = await crearTaller(cookies.coordinador, { fecha_ingreso: fecha });
			expect((await solicitarTaller(cookies.tecnico, 'PUT', `/${creada.id}/entrega`,
				{ fecha_entrega: fecha, accesorios_devueltos: [] })).status).toBe(200);
		},
	);
	it.each([null, 'Cable', [1], [''], ['   '], ['\t\n'], ['\u00a0'], ['Cable', 'cAbLe'],
		['Cable', ' CABLE '], ['Cuchilla', 'cuchilla']])('rechaza accesorios %j sin cambios parciales', async (accesorios) => {
		await rechazarDatos({ accesorios, cliente_nombre: 'No guardar' });
		expect(await detalleRespuesta(await solicitarTaller(cookies.tecnico, 'GET', `/${recepcion.id}`))).toEqual(recepcion);
	});
});

describe('Taller: validaciones de entrega', () => {
	it.each(fechasInvalidas)('rechaza entrega inválida %j', async (fecha_entrega) => {
		await errorTaller(await solicitarTaller(cookies.tecnico, 'PUT', `/${recepcion.id}/entrega`,
			{ fecha_entrega, accesorios_devueltos: [] }), 400);
	});
	it.each([null, 20261014, true, [], {}])('rechaza entrega no textual %j', async (fecha_entrega) => {
		await errorTaller(await solicitarTaller(cookies.tecnico, 'PUT', `/${recepcion.id}/entrega`,
			{ fecha_entrega, accesorios_devueltos: [] }), 400);
	});
	it.each([null, '1', [0], [-1], [1.2], ['1'], [true], [null], [9007199254740992], [99999]])(
		'rechaza checklist %j', async (accesorios_devueltos) => {
			await errorTaller(await solicitarTaller(cookies.tecnico, 'PUT', `/${recepcion.id}/entrega`,
				{ fecha_entrega: '2026-10-14', accesorios_devueltos }), 400);
		},
	);
	it('exige fecha y checklist y rechaza IDs repetidos', async () => {
		for (const body of [{ fecha_entrega: '2026-10-14' }, { accesorios_devueltos: [] },
			{ fecha_entrega: '2026-10-14', accesorios_devueltos: [recepcion.accesorios[0].id, recepcion.accesorios[0].id] }]) {
			await errorTaller(await solicitarTaller(cookies.tecnico, 'PUT', `/${recepcion.id}/entrega`, body), 400);
		}
	});
	it('rechaza entrega anterior al ingreso y edición que invierte las fechas', async () => {
		await errorTaller(await solicitarTaller(cookies.tecnico, 'PUT', `/${recepcion.id}/entrega`,
			{ fecha_entrega: '2026-10-08', accesorios_devueltos: [] }), 400);
		await solicitarTaller(cookies.tecnico, 'PUT', `/${recepcion.id}/entrega`,
			{ fecha_entrega: '2026-10-14', accesorios_devueltos: [] });
		await errorTaller(await solicitarTaller(cookies.coordinador, 'PATCH', `/${recepcion.id}`,
			{ fecha_ingreso: '2026-10-15', accesorios: [] }), 400);
		const actual = await detalleRespuesta(await solicitarTaller(cookies.tecnico, 'GET', `/${recepcion.id}`));
		expect(actual.fecha_ingreso).toBe('2026-10-09');
		expect(actual.accesorios).toEqual(recepcion.accesorios);
	});
});
