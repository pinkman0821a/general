import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crear, datos, detalle, error, lista, migrar, pedir, preparar, remoto } from './serviciosAyudas';

beforeAll(migrar);
beforeEach(preparar);

describe('Servicios: ocupación e indisponibilidad', () => {
	it.each(['garantia', 'servicio_presencial', 'instalacion'])('advierte sobrecarga presencial %s incluso realizado', async tipo => {
		const servicio = await crear({ tipo, valor_servicio: tipo === 'servicio_presencial' ? 250000 : null });
		expect((await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' })).status).toBe(200);
		await error(await pedir('POST', '', datos), 409);
		expect((await lista()).length).toBe(1);
		await crear({ tecnico_id: 3 });
		await crear({ fecha_programada: '2026-10-16' });
	});
	it('advierte en creaciones simultaneas sin confirmar y permite reintentar', async () => {
		const respuestas = await Promise.all([pedir('POST', '', datos), pedir('POST', '', datos)]);
		expect(respuestas.map(r => r.status).sort()).toEqual([201, 409]);
		expect((await lista()).length).toBe(1);
		await crear({ confirmar_sobrecarga: true });
		expect((await lista()).length).toBe(2);
	});
	it('permite remotos entre sí y junto a un presencial sin insertar ausencias', async () => {
		const presencial = await crear();
		const a = await crear(remoto); const b = await crear({ tipo: 'instalacion_remota', ciudad: null, direccion: null, valor_servicio: null });
		expect(presencial.ocupa_calendario).toBe(true);
		expect(a.ocupa_calendario).toBe(false); expect(b.ocupa_calendario).toBe(false);
		expect((await env.DB.prepare('SELECT * FROM tecnico_indisponibilidades').all()).results).toEqual([]);
	});
	it.each(['servicio_presencial', 'servicio_remoto', 'garantia', 'instalacion', 'instalacion_remota'])('rechaza ausencia manual para %s', async tipo => {
		await env.DB.prepare("INSERT INTO tecnico_indisponibilidades (tecnico_id, fecha) VALUES (2, '2026-10-15')").run();
		const remotoTipo = tipo === 'servicio_remoto' || tipo === 'instalacion_remota';
		await error(await pedir('POST', '', { ...datos, tipo, ciudad: remotoTipo ? null : datos.ciudad,
			direccion: remotoTipo ? null : datos.direccion, valor_servicio: tipo.startsWith('servicio_') ? 250000 : null }), 409);
	});
	it('rechaza reasignación y fecha ocupadas sin cambios parciales', async () => {
		const original = await crear(); await crear({ tecnico_id: 3 }); await crear({ fecha_programada: '2026-10-16' });
		for (const cambio of [{ tecnico_id: 3 }, { fecha_programada: '2026-10-16' }]) {
			await error(await pedir('PATCH', `/${original.id}`, { ...cambio, cliente_nombre: 'Cambio inválido' }), 409);
			expect(await detalle(await pedir('GET', `/${original.id}`))).toEqual(original);
		}
	});
	it('rechaza reasignación remota o cambio de fecha hacia ausencia', async () => {
		const servicio = await crear(remoto);
		await env.DB.prepare("INSERT INTO tecnico_indisponibilidades (tecnico_id, fecha) VALUES (3, '2026-10-15'), (2, '2026-10-16')").run();
		await error(await pedir('PATCH', `/${servicio.id}`, { tecnico_id: 3 }), 409);
		await error(await pedir('PATCH', `/${servicio.id}`, { fecha_programada: '2026-10-16' }), 409);
		expect(await detalle(await pedir('GET', `/${servicio.id}`))).toEqual(servicio);
	});
	it('libera y reserva día al cambiar tipo, validando el modelo completo', async () => {
		const servicio = await crear();
		await error(await pedir('PATCH', `/${servicio.id}`, { tipo: 'servicio_remoto' }), 400);
		await detalle(await pedir('PATCH', `/${servicio.id}`, remoto));
		const otro = await crear();
		await error(await pedir('PATCH', `/${servicio.id}`, { tipo: 'servicio_presencial', ciudad: 'Bogotá', direccion: 'Carrera' }), 409);
		await detalle(await pedir('PATCH', `/${otro.id}`, { fecha_programada: '2026-10-16' }));
		const reservado = await detalle(await pedir('PATCH', `/${servicio.id}`, { tipo: 'servicio_presencial', ciudad: 'Bogotá', direccion: 'Carrera' }));
		expect(reservado.ocupa_calendario).toBe(true);
		await error(await pedir('POST', '', datos), 409);
	});
	it('traslada la ocupación por reasignación', async () => {
		const servicio = await crear();
		await detalle(await pedir('PATCH', `/${servicio.id}`, { tecnico_id: 3 }));
		await crear();
		await error(await pedir('POST', '', { ...datos, tecnico_id: 3 }), 409);
	});
	it('permite edición parcial normalizada y limpiar opcionales', async () => {
		const servicio = await crear({ observaciones: '  Revisar  ' });
		expect(servicio.observaciones).toBe('Revisar');
		const editado = await detalle(await pedir('PATCH', `/${servicio.id}`, { cliente_nombre: ' Otro ', observaciones: null }));
		expect(editado).toMatchObject({ cliente_nombre: 'Otro', observaciones: null, maquina: 'Plotter', estado: 'pendiente' });
	});
});
