import { env } from 'cloudflare:workers';
import { applyD1Migrations, SELF } from 'cloudflare:test';
import { expect } from 'vitest';
import { crearSesion } from '../src/services/sessionService';
import type { AccesorioDb, RecepcionDb } from '../src/services/tallerValidacion';

export const ingreso = {
	fecha_ingreso: '2026-10-09', cliente_nombre: 'Publicidad ABC', cliente_telefono: '3001234567',
	maquina_tipo: 'Laser', falla_reportada: 'No dispara el laser', accesorios: [] as string[],
};
export const fechasInvalidas = ['', '20261009', '09/10/2026', '2026-1-09', '2026-10-9',
	'2026-10-09 ', ' 2026-10-09', '2026-10-09T00:00:00Z', '2026-02-30', '2026-02-29',
	'1900-02-29', '2100-02-29', '2026-04-31', '2026-00-09', '2026-13-09',
	'2026-10-00', '2026-10-32', '0000-01-01'];
export type Detalle = RecepcionDb & { accesorios: AccesorioDb[] };
export type Cookies = { coordinador: string; tecnico: string };

export async function migrarTaller() {
	const { TEST_MIGRATIONS } = env as Env & {
		TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1];
	};
	await applyD1Migrations(env.DB, TEST_MIGRATIONS);
}

export async function prepararTaller(): Promise<Cookies> {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM taller_recepciones'),
		env.DB.prepare('DELETE FROM sesiones'),
		env.DB.prepare('DELETE FROM usuarios'),
		env.DB.prepare(`INSERT INTO usuarios (id, nombre, user, rol) VALUES
			(1, 'Coordinador', 'coordinador', 'coordinador'), (2, 'Técnico', 'tecnico', 'tecnico')`),
	]);
	return {
		coordinador: `serviceos_session=${await crearSesion(env, 1)}`,
		tecnico: `serviceos_session=${await crearSesion(env, 2)}`,
	};
}

export function solicitarTaller(cookie: string, method: string, sufijo = '', body?: unknown) {
	return SELF.fetch(`https://example.com/api/taller${sufijo}`, {
		method, headers: { Cookie: cookie, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

export async function errorTaller(response: Response, status: number) {
	expect(response.status).toBe(status);
	expect(response.headers.get('Content-Type')).toContain('application/json');
	expect(await response.json()).toMatchObject({ status: 'error', message: expect.any(String) });
}

export async function crearTaller(cookie: string, datos: Record<string, unknown> = {}) {
	const response = await solicitarTaller(cookie, 'POST', '', { ...ingreso, ...datos });
	expect(response.status).toBe(201);
	return (await response.json() as { recepcion: Detalle }).recepcion;
}

export async function detalleRespuesta(response: Response): Promise<Detalle> {
	expect(response.status).toBe(200);
	return (await response.json() as { recepcion: Detalle }).recepcion;
}
