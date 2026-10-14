import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cookies, crear, datos, detalle, error, lista, migrar, pedir, preparar, remoto } from './serviciosAyudas';

beforeAll(migrar);
beforeEach(preparar);

async function advertencia(response: Response, existentes: number) {
	expect(response.status).toBe(409);
	expect(await response.json()).toEqual({ status: 'error', message: expect.any(String), codigo: 'sobrecarga_agenda',
		presenciales_existentes: existentes, presenciales_resultantes: existentes + 1 });
}

describe('Servicios: confirmacion de sobrecarga', () => {
	it.each([undefined, false])('exige confirmacion explicita %j y devuelve conteos actuales', async confirmar_sobrecarga => {
		const primero = await crear(); expect(primero.ocupa_calendario).toBe(true);
		await advertencia(await pedir('POST', '', { ...datos, confirmar_sobrecarga }), 1);
		expect((await lista()).map(s => s.id)).toEqual([primero.id]);
		const segundo = await crear({ confirmar_sobrecarga: true });
		expect((await lista()).map(s => s.id)).toEqual([primero.id, segundo.id]);
		await advertencia(await pedir('POST', '', datos), 2);
		const tercero = await crear({ confirmar_sobrecarga: true });
		expect(await env.DB.prepare('SELECT count(*) AS cantidad FROM servicios').first()).toEqual({ cantidad: 3 });
		expect(tercero).not.toHaveProperty('confirmar_sobrecarga');
		expect(await env.DB.prepare('SELECT * FROM servicios WHERE id = ?').bind(tercero.id).first()).not.toHaveProperty('confirmar_sobrecarga');
	});
	it('permite dos creaciones simultaneas confirmadas', async () => {
		const respuestas = await Promise.all([pedir('POST', '', { ...datos, confirmar_sobrecarga: true }), pedir('POST', '', { ...datos, confirmar_sobrecarga: true })]);
		expect(respuestas.map(r => r.status)).toEqual([201, 201]); expect((await lista()).length).toBe(2);
	});
	it.each([{ fecha_programada: '2026-10-16' }, { tecnico_id: 3 }])('PATCH hacia carga existente %j', async cambio => {
		const original = await crear(); const destino = await crear(cambio);
		await advertencia(await pedir('PATCH', `/${original.id}`, { ...cambio, observaciones: 'Mover', confirmar_sobrecarga: false }), 1);
		expect(await detalle(await pedir('GET', `/${original.id}`))).toEqual(original);
		const movido = await detalle(await pedir('PATCH', `/${original.id}`, { ...cambio, confirmar_sobrecarga: true }));
		expect(movido).toMatchObject({ tecnico_id: destino.tecnico_id, fecha_programada: destino.fecha_programada, ocupa_calendario: true });
		expect((await lista()).length).toBe(2);
	});
	it('remoto a presencial exige confirmacion y excluye el propio servicio', async () => {
		await crear(); const servicio = await crear(remoto);
		const presencial = { tipo: 'servicio_presencial', ciudad: 'Ciudad', direccion: 'Carrera' };
		await advertencia(await pedir('PATCH', `/${servicio.id}`, presencial), 1);
		expect((await detalle(await pedir('PATCH', `/${servicio.id}`, { ...presencial, confirmar_sobrecarga: true }))).ocupa_calendario).toBe(true);
	});
	it('observaciones, misma agenda y cambios entre presenciales no piden confirmacion', async () => {
		const servicio = await crear(); await crear({ confirmar_sobrecarga: true });
		for (const body of [{ observaciones: 'Revisar', confirmar_sobrecarga: false },
			{ tecnico_id: 2, fecha_programada: datos.fecha_programada, tipo: datos.tipo }, { tipo: 'garantia', valor_servicio: null }]) {
			expect((await detalle(await pedir('PATCH', `/${servicio.id}`, body))).id).toBe(servicio.id);
		}
	});
	it('movimiento a fecha libre no requiere confirmacion', async () => {
		const servicio = await crear(); await detalle(await pedir('PATCH', `/${servicio.id}`, { fecha_programada: '2026-10-16' }));
		await crear(); expect((await lista()).length).toBe(2);
	});
	it('presencial a remoto reduce carga y remotos coexisten sin confirmacion', async () => {
		const servicio = await crear(); const otro = await crear({ confirmar_sobrecarga: true });
		await detalle(await pedir('PATCH', `/${servicio.id}`, remoto)); await advertencia(await pedir('POST', '', datos), 1);
		await detalle(await pedir('PATCH', `/${otro.id}`, remoto)); await crear(); await crear(remoto); await crear(remoto);
		expect((await lista()).filter(s => s.ocupa_calendario)).toHaveLength(1);
	});
	it.each(['servicio_presencial', 'servicio_remoto', 'garantia', 'instalacion', 'instalacion_remota'])('confirmacion nunca omite ausencia manual en %s', async tipo => {
		await env.DB.prepare("INSERT INTO tecnico_indisponibilidades (tecnico_id, fecha) VALUES (2, '2026-10-15')").run();
		const remotoTipo = tipo === 'servicio_remoto' || tipo === 'instalacion_remota';
		const response = await pedir('POST', '', { ...datos, tipo, confirmar_sobrecarga: true,
			ciudad: remotoTipo ? null : datos.ciudad, direccion: remotoTipo ? null : datos.direccion, valor_servicio: tipo.startsWith('servicio_') ? 250000 : null });
		expect(response.status).toBe(409); expect(await response.json()).not.toHaveProperty('codigo', 'sobrecarga_agenda'); expect(await lista()).toEqual([]);
	});
	it('PATCH confirmado vuelve a comprobar ausencia sin cambios parciales', async () => {
		const servicio = await crear(); await crear({ tecnico_id: 3 }); await advertencia(await pedir('PATCH', `/${servicio.id}`, { tecnico_id: 3 }), 1);
		await env.DB.prepare("INSERT INTO tecnico_indisponibilidades (tecnico_id, fecha) VALUES (3, '2026-10-15')").run();
		await error(await pedir('PATCH', `/${servicio.id}`, { tecnico_id: 3, confirmar_sobrecarga: true }), 409);
		expect(await detalle(await pedir('GET', `/${servicio.id}`))).toEqual(servicio);
	});
	it('confirmacion conserva validacion completa y permisos', async () => {
		const servicio = await crear();
		await error(await pedir('POST', '', { ...datos, valor_servicio: -1, confirmar_sobrecarga: true }), 400);
		await error(await pedir('PATCH', `/${servicio.id}`, { maquina: '', confirmar_sobrecarga: true }), 400);
		await error(await pedir('PATCH', `/${servicio.id}`, { tecnico_id: 3, confirmar_sobrecarga: true }, cookies.tecnico), 403);
		await error(await pedir('POST', '', { ...datos, confirmar_sobrecarga: true }, cookies.tecnico), 403);
		await error(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado', confirmar_sobrecarga: true }), 400);
	});
	it.each([null, 'true', 1, {}, []])('rechaza confirmacion no booleana %j', async confirmar_sobrecarga => {
		await error(await pedir('POST', '', { ...datos, confirmar_sobrecarga }), 400);
		const servicio = await crear(); await error(await pedir('PATCH', `/${servicio.id}`, { observaciones: 'Editar', confirmar_sobrecarga }), 400);
	});
});
