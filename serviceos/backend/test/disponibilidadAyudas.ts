import { env } from 'cloudflare:workers';
import { applyD1Migrations, SELF } from 'cloudflare:test';
import { expect } from 'vitest';
import { crearSesion } from '../src/services/sessionService';

export const ruta = '/api/tecnicos/2/disponibilidad';
export const rango = '?desde=2026-10-01&hasta=2026-10-31';

export async function migrar() {
	const { TEST_MIGRATIONS } = env as Env & {
		TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1];
	};
	await applyD1Migrations(env.DB, TEST_MIGRATIONS);
}

export async function preparar() {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM tecnico_indisponibilidades'),
		env.DB.prepare('DELETE FROM sesiones'),
		env.DB.prepare('DELETE FROM usuarios'),
		env.DB.prepare(`INSERT INTO usuarios (id, nombre, user, rol) VALUES
			(1, 'Coordinador', 'coordinador', 'coordinador'),
			(2, 'Técnico', 'tecnico', 'tecnico'),
			(3, 'Otro técnico', 'otro', 'tecnico')`),
	]);
	return {
		coordinador: `serviceos_session=${await crearSesion(env, 1)}`,
		tecnico: `serviceos_session=${await crearSesion(env, 2)}`,
	};
}

export function peticion(cookie: string, method: string, url: string, body?: unknown) {
	return SELF.fetch(`https://example.com${url}`, {
		method,
		headers: { Cookie: cookie, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

export async function comprobarError(response: Response, status: number) {
	expect(response.status).toBe(status);
	expect(response.headers.get('Content-Type')).toContain('application/json');
	expect(await response.json()).toMatchObject({ status: 'error', message: expect.any(String) });
}
