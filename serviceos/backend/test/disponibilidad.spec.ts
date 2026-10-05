import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearSesion } from '../src/services/sessionService';
import { comprobarError, migrar, peticion, preparar, rango, ruta } from './disponibilidadAyudas';

let cookies: Awaited<ReturnType<typeof preparar>>;
const operaciones = [['GET', rango], ['POST', ''], ['DELETE', '/2026-10-12']];
const fechasInvalidas = [
	'', '12/10/2026', '2026-1-12', '2026-10-1', '2026-10-12T00:00:00Z',
	' 2026-10-12', '2026-10-12 ', '2026-02-30', '2026-02-29', '1900-02-29',
	'2026-04-31', '2026-00-12', '2026-13-12', '2026-10-00', '2026-10-32', '0000-01-01',
];

beforeAll(migrar);
beforeEach(async () => { cookies = await preparar(); });

function solicitar(method: string, url: string, body?: unknown) {
	return peticion(cookies.coordinador, method, url, body);
}

describe('Disponibilidad: permisos', () => {
	it.each(operaciones)('%s rechaza peticiones sin sesión', async (method, sufijo) => {
		await comprobarError(await peticion('', method, ruta + sufijo), 401);
	});
	it.each(operaciones)('%s rechaza sesiones de técnicos', async (method, sufijo) => {
		await comprobarError(await peticion(cookies.tecnico, method, ruta + sufijo), 403);
	});
	it.each(operaciones)('%s rechaza una sesión inexistente', async (method, sufijo) => {
		await comprobarError(await peticion('serviceos_session=inexistente', method, ruta + sufijo), 401);
	});
	it('rechaza sesión expirada y coordinador inactivo', async () => {
		await env.DB.prepare("UPDATE sesiones SET expires_at = '2000-01-01T00:00:00.000Z'").run();
		await comprobarError(await solicitar('GET', ruta + rango), 401);
		cookies.coordinador = `serviceos_session=${await crearSesion(env, 1)}`;
		await env.DB.prepare('UPDATE usuarios SET activo = 0 WHERE id = 1').run();
		await comprobarError(await solicitar('GET', ruta + rango), 401);
	});
});

describe('Disponibilidad: operaciones', () => {
	it('parte sin excepciones, crea con motivo recortado y elimina la excepción', async () => {
		expect(await (await solicitar('GET', ruta + rango)).json())
			.toEqual({ status: 'ok', indisponibilidades: [] });
		const creada = await solicitar('POST', ruta, { fecha: '2026-10-12', motivo: ' \tViaje\n ' });
		expect(creada.status).toBe(201);
		expect(await creada.json()).toEqual({ status: 'ok', indisponibilidad: {
			id: expect.any(Number), tecnico_id: 2, fecha: '2026-10-12', motivo: 'Viaje',
			created_at: expect.any(String),
		} });
		const eliminada = await solicitar('DELETE', ruta + '/2026-10-12');
		expect(eliminada.status).toBe(200);
		expect(await eliminada.json()).toMatchObject({ status: 'ok' });
		expect(await (await solicitar('GET', ruta + rango)).json())
			.toEqual({ status: 'ok', indisponibilidades: [] });
		await comprobarError(await solicitar('DELETE', ruta + '/2026-10-12'), 404);
		expect((await solicitar('POST', ruta, { fecha: '2026-10-12' })).status).toBe(201);
	});
	it.each([{}, { motivo: null }])('acepta motivo opcional: %j', async (body) => {
		const response = await solicitar('POST', ruta, { fecha: '2026-10-12', ...body });
		expect(response.status).toBe(201);
		expect(await response.json()).toMatchObject({ indisponibilidad: { motivo: null } });
	});
	it('filtra por rango inclusivo, ordena cronológicamente y aísla dos técnicos', async () => {
		for (const fecha of ['2026-10-31', '2026-11-01', '2026-10-12', '2026-09-30', '2026-10-01']) {
			expect((await solicitar('POST', ruta, { fecha })).status).toBe(201);
		}
		const otraRuta = '/api/tecnicos/3/disponibilidad';
		expect((await solicitar('POST', otraRuta, { fecha: '2026-10-12', motivo: 'Otro' })).status).toBe(201);
		const listado = await solicitar('GET', ruta + rango);
		expect(listado.status).toBe(200);
		expect(await listado.json()).toMatchObject({ indisponibilidades: [
			{ tecnico_id: 2, fecha: '2026-10-01' }, { tecnico_id: 2, fecha: '2026-10-12' },
			{ tecnico_id: 2, fecha: '2026-10-31' },
		] });
		expect(await (await solicitar('GET', ruta + '?desde=2026-10-12&hasta=2026-10-12')).json())
			.toMatchObject({ indisponibilidades: [{ fecha: '2026-10-12' }] });
		await comprobarError(await solicitar('DELETE', otraRuta + '/2026-10-31'), 404);
		await solicitar('DELETE', ruta + '/2026-10-12');
		expect(await (await solicitar('GET', otraRuta + rango)).json())
			.toMatchObject({ indisponibilidades: [{ tecnico_id: 3, fecha: '2026-10-12', motivo: 'Otro' }] });
	});
	it('rechaza duplicados sin sobrescribir el motivo, también con solicitudes simultáneas', async () => {
		await solicitar('POST', ruta, { fecha: '2026-10-12', motivo: 'Viaje' });
		await comprobarError(await solicitar('POST', ruta, { fecha: '2026-10-12', motivo: 'Otro' }), 409);
		expect(await (await solicitar('GET', ruta + rango)).json())
			.toMatchObject({ indisponibilidades: [{ motivo: 'Viaje' }] });
		const respuestas = await Promise.all([
			solicitar('POST', ruta, { fecha: '2026-10-13' }),
			solicitar('POST', ruta, { fecha: '2026-10-13' }),
		]);
		expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409]);
	});
	it.each(['2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31'])(
		'acepta la fecha real %s', async (fecha) => {
			expect((await solicitar('POST', ruta, { fecha })).status).toBe(201);
			expect((await solicitar('GET', ruta + `?desde=${fecha}&hasta=${fecha}`)).status).toBe(200);
			expect((await solicitar('DELETE', ruta + `/${fecha}`)).status).toBe(200);
		},
	);
});

describe('Disponibilidad: validaciones', () => {
	it.each(['abc', '0', '-1', '1.5', '1e2', '9007199254740992'])(
		'rechaza ID inválido %s en todas las operaciones', async (id) => {
			for (const [method, sufijo] of operaciones) {
				await comprobarError(await solicitar(method, `/api/tecnicos/${id}/disponibilidad${sufijo}`,
					method === 'POST' ? { fecha: '2026-10-12' } : undefined), 400);
			}
		},
	);
	it.each([['99', 404], ['1', 400]] as const)(
		'rechaza usuario %s inexistente o no técnico', async (id, status) => {
			for (const [method, sufijo] of operaciones) {
				await comprobarError(await solicitar(method, `/api/tecnicos/${id}/disponibilidad${sufijo}`,
					method === 'POST' ? { fecha: '2026-10-12' } : undefined), status);
			}
		},
	);
	it.each(fechasInvalidas)('rechaza fecha inválida o imposible %j', async (fecha) => {
		await comprobarError(await solicitar('POST', ruta, { fecha }), 400);
		// Una fecha vacía no forma una ruta DELETE; las demás sí llegan al validador.
		if (fecha) await comprobarError(await solicitar('DELETE', ruta + `/${encodeURIComponent(fecha)}`), 400);
		for (const query of [`desde=${encodeURIComponent(fecha)}&hasta=2026-12-31`,
			`desde=2026-01-01&hasta=${encodeURIComponent(fecha)}`]) {
			await comprobarError(await solicitar('GET', ruta + `?${query}`), 400);
		}
	});
	it.each([null, 20261012, true, [], {}])('rechaza fecha no textual %j', async (fecha) => {
		await comprobarError(await solicitar('POST', ruta, { fecha }), 400);
	});
	it.each(['', '?desde=2026-10-01', '?hasta=2026-10-31',
		'?desde=2026-10-31&hasta=2026-10-01',
		'?desde=2026-10-01&desde=2026-10-02&hasta=2026-10-31',
		'?desde=2026-10-01&hasta=2026-10-30&hasta=2026-10-31'])(
		'rechaza rango inválido %s', async (query) => {
			await comprobarError(await solicitar('GET', ruta + query), 400);
		},
	);
	it.each(['', '   ', '\t\r\n', '\u00a0', '\u2003', 42, false, [], {}])(
		'rechaza motivo inválido %j', async (motivo) => {
			await comprobarError(await solicitar('POST', ruta, { fecha: '2026-10-12', motivo }), 400);
		},
	);
	it.each([{}, null, [], 'texto'])('rechaza cuerpo inválido %j', async (body) => {
		await comprobarError(await solicitar('POST', ruta, body), 400);
	});
	it('rechaza JSON mal formado', async () => {
		await comprobarError(await SELF.fetch(`https://example.com${ruta}`, {
			method: 'POST', headers: { Cookie: cookies.coordinador }, body: '{',
		}), 400);
	});
});
