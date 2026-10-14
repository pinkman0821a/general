import { env } from 'cloudflare:workers';
import { SELF, applyD1Migrations } from 'cloudflare:test';
import { expect } from 'vitest';
import { crearSesion } from '../src/services/sessionService';
import type { respuestaServicio } from '../src/services/serviciosValidacion';

export const datos = {
	tipo: 'servicio_presencial', cliente_nombre: 'Publicidad ABC', cliente_telefono: '3001234567',
	ciudad: 'Bogotá', direccion: 'Carrera 1', fecha_programada: '2026-10-15', tecnico_id: 2,
	maquina: 'Plotter', tipo_falla: 'Caída negro', valor_servicio: 250000,
};
export type Servicio = ReturnType<typeof respuestaServicio>;
export let cookies: { coordinador: string; tecnico: string };
export async function migrar() {
	await applyD1Migrations(env.DB, (env as Env & { TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1] }).TEST_MIGRATIONS);
}
export async function preparar() {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM servicios'), env.DB.prepare('DELETE FROM tecnico_indisponibilidades'),
		env.DB.prepare('DELETE FROM sesiones'), env.DB.prepare('DELETE FROM usuarios'),
		env.DB.prepare(`INSERT INTO usuarios (id, nombre, user, rol, activo) VALUES
			(1, 'Coordinador', 'coordinador', 'coordinador', 1), (2, 'Juan', 'juan', 'tecnico', 1),
			(3, 'Carlos', 'carlos', 'tecnico', 1), (4, 'Inactivo', 'inactivo', 'tecnico', 0)`),
	]);
	cookies = { coordinador: `serviceos_session=${await crearSesion(env, 1)}`, tecnico: `serviceos_session=${await crearSesion(env, 2)}` };
}
export function pedir(method: string, sufijo = '', body?: unknown, cookie = cookies.coordinador) {
	return SELF.fetch(`https://example.com/api/servicios${sufijo}`, {
		method, headers: { Cookie: cookie, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}
export async function crear(cambios: Record<string, unknown> = {}) {
	const response = await pedir('POST', '', { ...datos, ...cambios });
	expect(response.status).toBe(201);
	return (await response.json() as { servicio: Servicio }).servicio;
}
export async function detalle(response: Response) {
	expect(response.status).toBe(200);
	return (await response.json() as { servicio: Servicio }).servicio;
}
export async function lista(sufijo = '', cookie = cookies.coordinador) {
	const response = await pedir('GET', sufijo, undefined, cookie);
	expect(response.status).toBe(200);
	return (await response.json() as { servicios: Servicio[] }).servicios;
}
export async function error(response: Response, status: number) {
	expect(response.status).toBe(status);
	expect(await response.json()).toMatchObject({ status: 'error', message: expect.any(String) });
}
export const remoto = { tipo: 'servicio_remoto', ciudad: null, direccion: null };
