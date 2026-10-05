import { env } from 'cloudflare:workers';
import { applyD1Migrations, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearSesion } from '../src/services/sessionService';

const rutas = [
	['GET', '/api/skills'],
	['POST', '/api/skills'],
	['GET', '/api/tecnicos/2/skills'],
	['POST', '/api/tecnicos/2/skills'],
	['DELETE', '/api/tecnicos/2/skills/1'],
];
let cookieCoordinador: string;
let cookieTecnico: string;

function peticion(method: string, ruta: string, body?: unknown, cookie = cookieCoordinador) {
	return SELF.fetch(`https://example.com${ruta}`, {
		method,
		headers: { Cookie: cookie, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

async function comprobarError(response: Response, status: number, message?: string) {
	expect(response.status).toBe(status);
	expect(await response.json()).toMatchObject({
		status: 'error',
		message: message ?? expect.any(String),
	});
}

beforeAll(async () => {
	const { TEST_MIGRATIONS } = env as Env & {
		TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1];
	};
	await applyD1Migrations(env.DB, TEST_MIGRATIONS);
});

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM tecnico_skills'),
		env.DB.prepare('DELETE FROM skills'),
		env.DB.prepare('DELETE FROM sesiones'),
		env.DB.prepare('DELETE FROM usuarios'),
		env.DB.prepare(`INSERT INTO usuarios (id, nombre, user, rol) VALUES
			(1, 'Coordinador', 'coordinador', 'coordinador'),
			(2, 'Técnico', 'tecnico', 'tecnico'),
			(3, 'Otro técnico', 'otro', 'tecnico')`),
	]);
	cookieCoordinador = `serviceos_session=${await crearSesion(env, 1)}`;
	cookieTecnico = `serviceos_session=${await crearSesion(env, 2)}`;
});

describe('Skills: permisos', () => {
	it.each(rutas)('%s %s rechaza peticiones sin sesión', async (method, ruta) => {
		await comprobarError(await peticion(method, ruta, undefined, ''), 401, 'No autenticado');
	});

	it.each(rutas)('%s %s rechaza sesiones de técnicos', async (method, ruta) => {
		await comprobarError(await peticion(method, ruta, undefined, cookieTecnico), 403);
	});

	it('rechaza sesiones inexistentes, expiradas y usuarios inactivos', async () => {
		await comprobarError(await peticion('GET', '/api/skills', undefined,
			'serviceos_session=inexistente'), 401);
		await env.DB.prepare('UPDATE sesiones SET expires_at = ?').bind('2000-01-01T00:00:00.000Z').run();
		await comprobarError(await peticion('GET', '/api/skills'), 401);
		cookieCoordinador = `serviceos_session=${await crearSesion(env, 1)}`;
		await env.DB.prepare('UPDATE usuarios SET activo = 0 WHERE id = 1').run();
		await comprobarError(await peticion('GET', '/api/skills'), 401);
	});
});

describe('Skills: catálogo', () => {
	it('lista el catálogo vacío y crea nombres recortados en orden alfabético', async () => {
		expect(await (await peticion('GET', '/api/skills')).json())
			.toEqual({ status: 'ok', skills: [] });
		const creada = await peticion('POST', '/api/skills', { nombre: '  Plotter eco-solvente  ' });
		expect(creada.status).toBe(201);
		expect(await creada.json()).toMatchObject({ status: 'ok', skill: {
			id: expect.any(Number), nombre: 'Plotter eco-solvente', created_at: expect.any(String),
		} });
		await peticion('POST', '/api/skills', { nombre: 'Cabezal DX7' });
		const listado = await peticion('GET', '/api/skills');
		expect(listado.status).toBe(200);
		expect(await listado.json()).toMatchObject({ skills: [
			{ nombre: 'Cabezal DX7' }, { nombre: 'Plotter eco-solvente' },
		] });
	});

	it.each([{}, { nombre: '' }, { nombre: '   ' }, { nombre: 42 }, null, []])(
		'rechaza un nombre o cuerpo inválido: %j', async (body) => {
			await comprobarError(await peticion('POST', '/api/skills', body), 400);
		},
	);

	it('rechaza JSON mal formado', async () => {
		const response = await SELF.fetch('https://example.com/api/skills', {
			method: 'POST', headers: { Cookie: cookieCoordinador }, body: '{',
		});
		await comprobarError(response, 400);
	});

	it('rechaza skills duplicadas también con espacios o diferencias de mayúsculas ASCII', async () => {
		await peticion('POST', '/api/skills', { nombre: 'Laser CO2' });
		await comprobarError(await peticion('POST', '/api/skills', { nombre: 'Laser CO2' }), 409);
		await comprobarError(await peticion('POST', '/api/skills', { nombre: '  laser co2  ' }), 409);
	});
});

describe('Skills: técnicos', () => {
	beforeEach(async () => {
		await env.DB.prepare("INSERT INTO skills (id, nombre) VALUES (1, 'Mantenimiento')").run();
	});

	it('consulta, asigna y quita skills sin afectar a otro técnico ni al catálogo', async () => {
		expect(await (await peticion('GET', '/api/tecnicos/2/skills')).json())
			.toEqual({ status: 'ok', skills: [] });
		const asignada = await peticion('POST', '/api/tecnicos/2/skills', { skill_id: 1 });
		expect(asignada.status).toBe(201);
		expect(await asignada.json()).toMatchObject({ status: 'ok', asignacion: {
			tecnico_id: 2, skill_id: 1, created_at: expect.any(String),
		} });
		await peticion('POST', '/api/tecnicos/3/skills', { skill_id: 1 });
		expect(await (await peticion('GET', '/api/tecnicos/2/skills')).json())
			.toMatchObject({ skills: [{ id: 1, nombre: 'Mantenimiento' }] });
		const quitada = await peticion('DELETE', '/api/tecnicos/2/skills/1');
		expect(quitada.status).toBe(200);
		expect(await quitada.json()).toMatchObject({ status: 'ok' });
		expect(await (await peticion('GET', '/api/tecnicos/2/skills')).json())
			.toEqual({ status: 'ok', skills: [] });
		expect(await (await peticion('GET', '/api/tecnicos/3/skills')).json())
			.toMatchObject({ skills: [{ id: 1 }] });
		expect(await (await peticion('GET', '/api/skills')).json())
			.toMatchObject({ skills: [{ id: 1 }] });
		await comprobarError(await peticion('DELETE', '/api/tecnicos/2/skills/1'), 404);
	});

	it('rechaza asignaciones duplicadas', async () => {
		await peticion('POST', '/api/tecnicos/2/skills', { skill_id: 1 });
		await comprobarError(await peticion('POST', '/api/tecnicos/2/skills', { skill_id: 1 }), 409);
	});

	it('impide duplicados ante creaciones y asignaciones simultáneas', async () => {
		const creadas = await Promise.all([
			peticion('POST', '/api/skills', { nombre: 'Laser CO2' }),
			peticion('POST', '/api/skills', { nombre: 'Laser CO2' }),
		]);
		expect(creadas.map((response) => response.status).sort()).toEqual([201, 409]);
		const asignadas = await Promise.all([
			peticion('POST', '/api/tecnicos/2/skills', { skill_id: 1 }),
			peticion('POST', '/api/tecnicos/2/skills', { skill_id: 1 }),
		]);
		expect(asignadas.map((response) => response.status).sort()).toEqual([201, 409]);
	});

	it.each(['abc', '0', '-1', '1.5', '1e2', '9007199254740992'])(
		'rechaza el ID de técnico %s en todas las operaciones', async (id) => {
			await comprobarError(await peticion('GET', `/api/tecnicos/${id}/skills`), 400);
			await comprobarError(await peticion('POST', `/api/tecnicos/${id}/skills`, { skill_id: 1 }), 400);
			await comprobarError(await peticion('DELETE', `/api/tecnicos/${id}/skills/1`), 400);
		},
	);

	it.each([null, 0, -1, 1.5, '1', 9007199254740992])(
		'rechaza el ID de skill %j al asignar', async (skill_id) => {
			await comprobarError(await peticion('POST', '/api/tecnicos/2/skills', { skill_id }), 400);
		},
	);

	it.each(['abc', '0', '-1', '1.5', '9007199254740992'])(
		'rechaza el ID de skill %s al quitar', async (id) => {
			await comprobarError(await peticion('DELETE', `/api/tecnicos/2/skills/${id}`), 400);
		},
	);

	it.each([['99', 404], ['1', 400]])(
		'rechaza el usuario %s inexistente o que no es técnico', async (id, status) => {
			await comprobarError(await peticion('GET', `/api/tecnicos/${id}/skills`), status as number);
			await comprobarError(await peticion('POST', `/api/tecnicos/${id}/skills`, { skill_id: 1 }), status as number);
			await comprobarError(await peticion('DELETE', `/api/tecnicos/${id}/skills/1`), status as number);
		},
	);

	it('rechaza skills inexistentes y cuerpos de asignación inválidos', async () => {
		await comprobarError(await peticion('POST', '/api/tecnicos/2/skills', { skill_id: 99 }), 404);
		await comprobarError(await peticion('DELETE', '/api/tecnicos/2/skills/99'), 404);
		for (const body of [{}, null, []]) {
			await comprobarError(await peticion('POST', '/api/tecnicos/2/skills', body), 400);
		}
		await comprobarError(await SELF.fetch('https://example.com/api/tecnicos/2/skills', {
			method: 'POST', headers: { Cookie: cookieCoordinador }, body: '{',
		}), 400);
	});

	it('D1 acepta directamente nombres sin espacios en los extremos', async () => {
		await env.DB.prepare('INSERT INTO skills (nombre) VALUES (?)').bind('Laser CO2').run();
		expect(await env.DB.prepare('SELECT nombre FROM skills WHERE nombre = ?')
			.bind('Laser CO2').first()).toEqual({ nombre: 'Laser CO2' });
	});

	it.each([' Laser CO2', 'Laser CO2 ', '   ', ''])(
		'D1 rechaza directamente el nombre inválido %j al insertar y actualizar', async (nombre) => {
			await expect(env.DB.prepare('INSERT INTO skills (nombre) VALUES (?)')
				.bind(nombre).run()).rejects.toThrow(/CHECK constraint failed/);
			await expect(env.DB.prepare('UPDATE skills SET nombre = ? WHERE id = 1')
				.bind(nombre).run()).rejects.toThrow(/CHECK constraint failed/);
		},
	);

	it('las restricciones D1 impiden nombres y relaciones duplicados o referencias inexistentes', async () => {
		await expect(env.DB.prepare("INSERT INTO skills (nombre) VALUES ('mantenimiento')").run()).rejects.toThrow();
		await expect(env.DB.prepare("INSERT INTO skills (nombre) VALUES ('   ')").run()).rejects.toThrow();
		await env.DB.prepare('INSERT INTO tecnico_skills (tecnico_id, skill_id) VALUES (2, 1)').run();
		await expect(env.DB.prepare('INSERT INTO tecnico_skills (tecnico_id, skill_id) VALUES (2, 1)').run()).rejects.toThrow();
		await expect(env.DB.prepare('INSERT INTO tecnico_skills (tecnico_id, skill_id) VALUES (99, 1)').run()).rejects.toThrow();
		await expect(env.DB.prepare('INSERT INTO tecnico_skills (tecnico_id, skill_id) VALUES (2, 99)').run()).rejects.toThrow();
	});
});
