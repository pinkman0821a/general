import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
	crearTaller, detalleRespuesta, errorTaller, migrarTaller, prepararTaller, solicitarTaller,
} from './tallerAyudas';
import type { Cookies, Detalle } from './tallerAyudas';

let cookies: Cookies;
beforeAll(migrarTaller);
beforeEach(async () => { cookies = await prepararTaller(); });
const operaciones = [['GET', ''], ['GET', '/1'], ['POST', ''], ['PATCH', '/1'], ['PUT', '/1/entrega']];

describe('Taller: permisos', () => {
	it.each(operaciones)('%s %s requiere sesión válida y usuario activo', async (method, sufijo) => {
		for (const cookie of ['', 'serviceos_session=inexistente']) {
			await errorTaller(await solicitarTaller(cookie, method, sufijo), 401);
		}
		await env.DB.prepare("UPDATE sesiones SET expires_at = '2000-01-01T00:00:00Z'").run();
		await errorTaller(await solicitarTaller(cookies.coordinador, method, sufijo), 401);
		cookies = await prepararTaller();
		await env.DB.prepare('UPDATE usuarios SET activo = 0').run();
		for (const cookie of Object.values(cookies)) {
			await errorTaller(await solicitarTaller(cookie, method, sufijo), 401);
		}
	});
	it('el técnico no puede crear ni modificar ningún dato general', async () => {
		const recepcion = await crearTaller(cookies.coordinador);
		await errorTaller(await solicitarTaller(cookies.tecnico, 'POST', '', {}), 403);
		await errorTaller(await solicitarTaller(cookies.tecnico, 'PATCH', `/${recepcion.id}`,
			{ cliente_nombre: 'Otro', accesorios: ['Cable'] }), 403);
		expect(await detalleRespuesta(await solicitarTaller(cookies.tecnico, 'GET', `/${recepcion.id}`)))
			.toEqual(recepcion);
	});
	it('no ofrece DELETE ni elimina el historial', async () => {
		const recepcion = await crearTaller(cookies.coordinador);
		expect((await solicitarTaller(cookies.coordinador, 'DELETE', `/${recepcion.id}`)).status).toBe(404);
		expect((await solicitarTaller(cookies.coordinador, 'GET', `/${recepcion.id}`)).status).toBe(200);
	});
});

describe('Taller: ingreso, consultas y edición', () => {
	it('crea sin accesorios y devuelve detalle completo con opcionales nulos', async () => {
		const recepcion = await crearTaller(cookies.coordinador);
		expect(recepcion).toMatchObject({ cliente_contacto: null, maquina_tamano: null, maquina_marca: null,
			maquina_modelo: null, maquina_serial: null, observaciones: null, fecha_entrega: null,
			estado: 'en_taller', accesorios: [], created_at: expect.any(String), updated_at: expect.any(String) });
		for (const cookie of Object.values(cookies)) {
			expect(await detalleRespuesta(await solicitarTaller(cookie, 'GET', `/${recepcion.id}`))).toEqual(recepcion);
		}
	});
	it('normaliza todos los textos y crea accesorios recibidos con IDs propios', async () => {
		const recepcion = await crearTaller(cookies.coordinador, {
			cliente_nombre: ' \tEmpresa\n', cliente_contacto: ' Carlos ', cliente_telefono: ' 300 ',
			maquina_tipo: ' Laser ', maquina_tamano: ' 40x50 ', maquina_marca: ' Marca ',
			maquina_modelo: ' Modelo ', maquina_serial: ' Serial ', falla_reportada: ' Falla ',
			observaciones: ' Observación ', accesorios: [' Cable de poder ', '\tCable USB\n'],
		});
		expect(recepcion).toMatchObject({ cliente_nombre: 'Empresa', cliente_contacto: 'Carlos',
			cliente_telefono: '300', maquina_tipo: 'Laser', maquina_tamano: '40x50', maquina_marca: 'Marca',
			maquina_modelo: 'Modelo', maquina_serial: 'Serial', falla_reportada: 'Falla', observaciones: 'Observación' });
		expect(recepcion.accesorios).toEqual(['Cable de poder', 'Cable USB'].map((nombre) => ({
			id: expect.any(Number), recepcion_id: recepcion.id, nombre, devuelto: 0, created_at: expect.any(String),
		})));
	});
	it('lista, filtra estado derivado y ordena por fecha e ID descendentes', async () => {
		expect(await (await solicitarTaller(cookies.tecnico, 'GET')).json()).toEqual({ status: 'ok', recepciones: [] });
		const anterior = await crearTaller(cookies.coordinador, { fecha_ingreso: '2026-10-01' });
		const reciente = await crearTaller(cookies.coordinador);
		const ultima = await crearTaller(cookies.coordinador);
		await solicitarTaller(cookies.coordinador, 'PUT', `/${reciente.id}/entrega`,
			{ fecha_entrega: '2026-10-14', accesorios_devueltos: [] });
		for (const cookie of Object.values(cookies)) {
			for (const [filtro, ids] of [['', [ultima.id, reciente.id, anterior.id]],
				['?estado=en_taller', [ultima.id, anterior.id]], ['?estado=entregada', [reciente.id]]] as const) {
				const response = await solicitarTaller(cookie, 'GET', filtro);
				expect(response.status).toBe(200);
				const body = await response.json() as { recepciones: Detalle[] };
				expect(body.recepciones.map((r) => r.id)).toEqual(ids);
			}
		}
	});
	it.each(['Publicidad', '300123', 'Laser', 'MarcaBuscada', 'ModeloBuscado', 'SerialBuscado', 'ContactoBuscado'])(
		'busca por texto útil %s y combina con estado', async (buscar) => {
			const recepcion = await crearTaller(cookies.coordinador, { maquina_marca: 'MarcaBuscada',
				maquina_modelo: 'ModeloBuscado', maquina_serial: 'SerialBuscado', cliente_contacto: 'ContactoBuscado' });
			const body = await (await solicitarTaller(cookies.tecnico, 'GET',
				`?estado=en_taller&buscar=${buscar.toLowerCase()}`)).json();
			expect(body).toMatchObject({ recepciones: [{ id: recepcion.id }] });
			expect(await (await solicitarTaller(cookies.tecnico, 'GET', '?buscar=noexiste')).json())
				.toMatchObject({ recepciones: [] });
		},
	);
	it('trata comodines e intentos de SQL como texto literal', async () => {
		await crearTaller(cookies.coordinador, { cliente_nombre: 'Empresa 100%_\\' });
		await crearTaller(cookies.coordinador);
		for (const buscar of ['%', '_', '\\']) {
			expect(await (await solicitarTaller(cookies.tecnico, 'GET', `?buscar=${encodeURIComponent(buscar)}`)).json())
				.toMatchObject({ recepciones: [{ cliente_nombre: 'Empresa 100%_\\' }] });
		}
		expect(await (await solicitarTaller(cookies.tecnico, 'GET', "?buscar='OR%201=1--")).json())
			.toMatchObject({ recepciones: [] });
	});
	it('corrige datos y accesorios preservando IDs y devoluciones de los conservados', async () => {
		const recepcion = await crearTaller(cookies.coordinador, { accesorios: ['Cable', 'Cuchilla'] });
		await solicitarTaller(cookies.tecnico, 'PUT', `/${recepcion.id}/entrega`, {
			fecha_entrega: '2026-10-14', accesorios_devueltos: [recepcion.accesorios[0].id],
		});
		const editada = await detalleRespuesta(await solicitarTaller(cookies.coordinador, 'PATCH', `/${recepcion.id}`, {
			cliente_nombre: ' Nueva empresa ', cliente_contacto: null, maquina_tipo: 'Plotter',
			accesorios: [' cable ', 'Fuente'],
		}));
		expect(editada).toMatchObject({ cliente_nombre: 'Nueva empresa', cliente_contacto: null,
			maquina_tipo: 'Plotter', fecha_entrega: '2026-10-14', estado: 'entregada' });
		expect(editada.accesorios).toMatchObject([
			{ id: recepcion.accesorios[0].id, nombre: 'cable', devuelto: 1 }, { nombre: 'Fuente', devuelto: 0 },
		]);
		const sinCambio = await detalleRespuesta(await solicitarTaller(cookies.coordinador, 'PATCH',
			`/${recepcion.id}`, { observaciones: ' Corregidas ' }));
		expect(sinCambio.accesorios).toEqual(editada.accesorios);
		const vacia = await detalleRespuesta(await solicitarTaller(cookies.coordinador, 'PATCH',
			`/${recepcion.id}`, { accesorios: [] }));
		expect(vacia.accesorios).toEqual([]);
	});
});

describe('Taller: entrega', () => {
	it.each(['coordinador', 'tecnico'] as const)('%s registra, corrige fecha y reemplaza el checklist parcial', async (rol) => {
		const recepcion = await crearTaller(cookies.coordinador, { accesorios: ['Cable', 'USB', 'Cuchilla'] });
		const ids = recepcion.accesorios.map((a) => a.id);
		for (const [fecha, devueltos, marcas] of [
			['2026-10-14', [ids[0], ids[2]], [1, 0, 1]],
			['2026-10-15', [ids[1]], [0, 1, 0]], ['2026-10-09', [], [0, 0, 0]],
		] as const) {
			const entregada = await detalleRespuesta(await solicitarTaller(cookies[rol], 'PUT', `/${recepcion.id}/entrega`,
				{ fecha_entrega: fecha, accesorios_devueltos: devueltos }));
			expect(entregada).toMatchObject({ fecha_entrega: fecha, estado: 'entregada' });
			expect(entregada.accesorios.map((a) => a.devuelto)).toEqual(marcas);
		}
	});
	it('aísla accesorios y no guarda parcialmente una entrega inválida', async () => {
		const primera = await crearTaller(cookies.coordinador, { accesorios: ['Cable'] });
		const otra = await crearTaller(cookies.coordinador, { accesorios: ['Cable'] });
		await errorTaller(await solicitarTaller(cookies.tecnico, 'PUT', `/${primera.id}/entrega`, {
			fecha_entrega: '2026-10-14', accesorios_devueltos: [primera.accesorios[0].id, otra.accesorios[0].id],
		}), 400);
		for (const recepcion of [primera, otra]) {
			expect(await detalleRespuesta(await solicitarTaller(cookies.tecnico, 'GET', `/${recepcion.id}`))).toEqual(recepcion);
		}
	});
	it('crear recepciones simultáneamente mantiene los accesorios con su recepción', async () => {
		const recepciones = await Promise.all(['USB', 'Cable', 'Fuente'].map((nombre) =>
			crearTaller(cookies.coordinador, { cliente_nombre: nombre, accesorios: [nombre] })));
		for (const recepcion of recepciones) {
			expect(recepcion.accesorios).toMatchObject([{ recepcion_id: recepcion.id, nombre: recepcion.cliente_nombre }]);
		}
	});
});
