import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cookies, crear, datos, detalle, error, lista, migrar, pedir, preparar, remoto } from './serviciosAyudas';

beforeAll(migrar);
beforeEach(preparar);

describe('Servicios: permisos e historial', () => {
	it.each(['sin sesión', 'expirada', 'inactivo'])('protege todas las operaciones: %s', async caso => {
		const servicio = await crear();
		if (caso === 'expirada') await env.DB.prepare("UPDATE sesiones SET expires_at = '2000-01-01'").run();
		if (caso === 'inactivo') await env.DB.prepare('UPDATE usuarios SET activo = 0 WHERE id = 1').run();
		for (const [method, sufijo, body] of [
			['GET', '', undefined], ['GET', `/${servicio.id}`, undefined], ['POST', '', datos],
			['PATCH', `/${servicio.id}`, { cliente_nombre: 'Otro' }], ['PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }],
		] as const) await error(await pedir(method, sufijo, body, caso === 'sin sesión' ? '' : cookies.coordinador), 401);
	});
	it('limita al técnico a consultar y cambiar estado propio', async () => {
		const propio = await crear(); const ajeno = await crear({ tecnico_id: 3 });
		await error(await pedir('POST', '', datos, cookies.tecnico), 403);
		await error(await pedir('PATCH', `/${propio.id}`, { tecnico_id: 3 }, cookies.tecnico), 403);
		await error(await pedir('GET', `/${ajeno.id}`, undefined, cookies.tecnico), 403);
		await error(await pedir('PATCH', `/${ajeno.id}/estado`, { estado: 'realizado' }, cookies.tecnico), 403);
		expect((await lista('', cookies.tecnico)).map(s => s.id)).toEqual([propio.id]);
		expect((await detalle(await pedir('GET', `/${propio.id}`, undefined, cookies.tecnico))).id).toBe(propio.id);
	});
	it.each(['0', '-1', 'abc', '1.5', '9007199254740992'])('rechaza ID %s', async id => {
		await error(await pedir('GET', `/${id}`), 400);
		await error(await pedir('PATCH', `/${id}`, {}), 400);
		await error(await pedir('PATCH', `/${id}/estado`, { estado: 'pendiente' }), 400);
	});
	it('responde 404 para servicio inexistente', async () => {
		for (const sufijo of ['/999', '/999/estado']) await error(await pedir('PATCH', sufijo, {}), 404);
		await error(await pedir('GET', '/999'), 404);
	});
	it('mantiene historial del técnico inactivo y permite edición sin reasignación', async () => {
		const servicio = await crear(); await env.DB.prepare('UPDATE usuarios SET activo = 0 WHERE id = 2').run();
		expect((await lista()).length).toBe(1);
		expect((await detalle(await pedir('PATCH', `/${servicio.id}`, { observaciones: 'Histórico' }))).tecnico_id).toBe(2);
		await error(await pedir('PATCH', `/${servicio.id}`, { fecha_programada: '2026-10-16' }), 400);
	});
	it('reasigna pertenencia y pago sin movimientos financieros', async () => {
		const servicio = await crear({ tipo: 'instalacion', valor_servicio: null });
		const nuevo = await detalle(await pedir('PATCH', `/${servicio.id}`, { tecnico_id: 3 }));
		expect(nuevo).toMatchObject({ tecnico_id: 3, pago_tecnico: 100000, estado: 'pendiente' });
		expect(await lista('', cookies.tecnico)).toEqual([]);
		await error(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }, cookies.tecnico), 403);
	});
	it.each([
		['garantia', null, 0], ['instalacion', null, 100000], ['instalacion_remota', null, 50000],
		['servicio_presencial', 250000, 100000], ['servicio_remoto', 3, 1], ['servicio_remoto', 4, 2],
	] as const)('deriva pago %s y no depende del estado', async (tipo, valor_servicio, pago) => {
		const esRemoto = tipo === 'instalacion_remota' || tipo === 'servicio_remoto';
		const servicio = await crear({ tipo, valor_servicio, ...(esRemoto ? { ciudad: null, direccion: null } : {}) });
		expect(servicio.pago_tecnico).toBe(pago);
		for (const estado of ['en_proceso', 'realizado', 'pendiente']) {
			const actualizado = await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado, trabajo_realizado: 'REVISION' }, cookies.tecnico));
			expect(actualizado).toMatchObject({ estado, pago_tecnico: pago });
		}
	});
});

describe('Servicios: filtros', () => {
	it('combina filtros, conserva meses y ordena por fecha e ID', async () => {
		const primero = await crear({ ...remoto, tarjeteria: 'Sunjung', cabezal: 'DX7' });
		const segundo = await crear({ ...remoto });
		await crear({ tecnico_id: 3, fecha_programada: '2026-09-01' });
		await detalle(await pedir('PATCH', `/${primero.id}/estado`, { estado: 'realizado', trabajo_realizado: 'REVISION' }));
		expect((await lista()).map(s => s.fecha_programada)).toEqual(['2026-09-01', '2026-10-15', '2026-10-15']);
		expect((await lista('?mes=2026-10')).map(s => s.id)).toEqual([primero.id, segundo.id]);
		expect((await lista('?mes=2026-10&estado=realizado&tipo=servicio_remoto&tecnico_id=2&buscar=DX7')).map(s => s.id)).toEqual([primero.id]);
		for (const buscar of ['Publicidad', '300123', 'Plotter', 'negro', 'Sunjung', 'DX7']) expect((await lista(`?buscar=${buscar}`)).length).toBeGreaterThan(0);
		expect((await lista('?buscar=Bogot')).length).toBe(1);
		expect(await lista('?buscar=%25')).toEqual([]);
	});
	it.each(['mes=2026-00', 'mes=2026-13', 'mes=0000-01', 'mes=2026-1', 'estado=cancelado', 'tipo=taller',
		'tecnico_id=0', 'tecnico_id=abc', 'buscar=', 'mes=2026-10&mes=2026-11', 'otro=1'])('rechaza filtro %s', async filtro => {
		await error(await pedir('GET', `?${filtro}`), 400);
	});
	it('reserva filtro técnico al coordinador', async () => { await error(await pedir('GET', '?tecnico_id=2', undefined, cookies.tecnico), 403); });
});
