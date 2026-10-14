import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cookies, crear, detalle, error, migrar, pedir, preparar, remoto } from './serviciosAyudas';
import type { consultarDetalleFinanzas, consultarFinanzas } from '../src/services/finanzasConsulta';

beforeAll(migrar);
beforeEach(preparar);

function finanzas(sufijo = '/resumen?mes=2026-10', cookie = cookies.coordinador) {
	return SELF.fetch(`https://example.com/api/finanzas${sufijo}`, { headers: { Cookie: cookie } });
}
async function resumen(sufijo = '/resumen?mes=2026-10') {
	const respuesta = await finanzas(sufijo);
	expect(respuesta.status).toBe(200);
	expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
	return await respuesta.json() as Awaited<ReturnType<typeof consultarFinanzas>>;
}
async function detalleFinanzas(id: number, mes = '2026-10') {
	const respuesta = await finanzas(`/tecnicos/${id}?mes=${mes}`);
	expect(respuesta.status).toBe(200);
	return await respuesta.json() as Awaited<ReturnType<typeof consultarDetalleFinanzas>>;
}
async function operacion(cambios: Record<string, unknown> = {}, estado = 'pendiente') {
	const servicio = await crear({ ...remoto, confirmar_sobrecarga: true, trabajo_realizado: 'REVISION', ...cambios });
	if (estado !== 'pendiente') await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado }));
	return servicio;
}
async function escenario() {
	const presencial = await operacion({ tipo: 'servicio_presencial', ciudad: 'Bogotá', direccion: 'Calle', valor_servicio: 250001 });
	await operacion({ valor_servicio: 3 }, 'en_proceso');
	await operacion({ tipo: 'instalacion', ciudad: 'Cali', direccion: 'Calle', valor_servicio: null }, 'realizado');
	await operacion({ tecnico_id: 3, valor_servicio: 4 }, 'realizado');
	await operacion({ tecnico_id: 3, tipo: 'instalacion_remota', valor_servicio: null });
	await operacion({ tipo: 'garantia', ciudad: 'Bogotá', direccion: 'Calle', valor_servicio: null }, 'realizado');
	await operacion({ tecnico_id: 3, valor_servicio: 1 });
	await env.DB.prepare('UPDATE usuarios SET activo = 1 WHERE id = 4').run();
	await operacion({ tecnico_id: 4, valor_servicio: 500 });
	await env.DB.prepare('UPDATE usuarios SET activo = 0 WHERE id = 4').run();
	return presencial;
}

describe('Finanzas: resumen, detalle e históricos con D1 real', () => {
	it.each(['/resumen?mes=2026-10', '/tecnicos/2?mes=2026-10', '/tecnicos/3?mes=2026-10',
		'/resumen?mes=incorrecto', '/tecnicos/abc?mes=2026-10'])('solo coordinador: %s', async ruta => {
		await error(await finanzas(ruta, ''), 401);
		await error(await finanzas(ruta, cookies.tecnico), 403);
	});
	it.each(['', '?mes=', '?mes=2026-1', '?mes=2026-00', '?mes=2026-13', '?mes=0000-01',
		'?mes=2026-10-01', '?mes=2026-10&mes=2026-11', '?mes=2026-10%20'])('mes estricto %s', async consulta => {
		await error(await finanzas(`/resumen${consulta}`), 400);
		await error(await finanzas(`/tecnicos/2${consulta}`), 400);
	});
	it.each(['abc', '0', '-1', '1.5', '9007199254740992'])('ID de detalle inválido %s', async id => {
		await error(await finanzas(`/tecnicos/${id}?mes=2026-10`), 400);
	});
	it.each([1, 999])('coordinador y usuario inexistente no son técnicos %s', async id => {
		await error(await finanzas(`/tecnicos/${id}?mes=2026-10`), 404);
	});
	it('incluye todos los estados y tipos con pago, redondeo, KPIs e inactivos', async () => {
		await escenario();
		const datos = await resumen();
		expect(datos.resumen).toEqual({ pago_tecnicos: 250203, servicios_con_pago: 6, tecnicos_con_actividad: 3, promedio_por_servicio: 41700.5 });
		expect(datos.tecnicos).toEqual([
			{ id: 2, nombre: 'Juan', activo: 1, servicios_con_pago: 3, pendientes: 1, en_proceso: 1, realizados: 1, pago_generado: 200001 },
			{ id: 3, nombre: 'Carlos', activo: 1, servicios_con_pago: 2, pendientes: 1, en_proceso: 0, realizados: 1, pago_generado: 50002 },
			{ id: 4, nombre: 'Inactivo', activo: 0, servicios_con_pago: 1, pendientes: 1, en_proceso: 0, realizados: 0, pago_generado: 200 },
		]);
		const servicios = await (await pedir('GET', '/resumen-pagos?mes=2026-10')).json() as { pago_tecnicos: number };
		expect(datos.resumen.pago_tecnicos).toBe(servicios.pago_tecnicos);
	});
	it.each([
		['garantia', null, 0], ['instalacion', null, 100000], ['instalacion_remota', null, 50000],
		['servicio_presencial', 250001, 100000], ['servicio_remoto', 3, 1], ['servicio_remoto', 4, 2], ['servicio_remoto', 1, 0],
	] as const)('regla central %s valor %s genera %s', async (tipo, valor_servicio, pago) => {
		const presencial = ['garantia', 'instalacion', 'servicio_presencial'].includes(tipo);
		await operacion({ tipo, valor_servicio, ...(presencial ? { ciudad: 'Bogotá', direccion: 'Calle' } : {}) });
		const datos = await resumen();
		expect(datos.resumen).toMatchObject({ pago_tecnicos: pago, servicios_con_pago: pago > 0 ? 1 : 0,
			tecnicos_con_actividad: pago > 0 ? 1 : 0, promedio_por_servicio: pago });
	});
	it('detalle solo del técnico y mes, orden fecha/id, total y proyección sin comprobante', async () => {
		await escenario();
		const primero = await operacion({ fecha_programada: '2026-10-01', cliente_nombre: 'Primero', valor_servicio: 4 });
		const segundo = await operacion({ fecha_programada: '2026-10-01', cliente_nombre: 'Segundo', valor_servicio: 3 });
		await operacion({ fecha_programada: '2026-09-01', cliente_nombre: 'Otro mes' });
		await env.DB.prepare("UPDATE servicios SET comprobante_key = 'privado', comprobante_nombre = 'privado.jpg' WHERE id = ?")
			.bind(primero.id).run();
		const datos = await detalleFinanzas(2);
		expect(datos.servicios.length).toBe(5);
		expect(datos.servicios.slice(0, 2).map(servicio => servicio.id)).toEqual([primero.id, segundo.id]);
		expect(datos.pago_generado).toBe(200004);
		expect(datos.servicios.map(servicio => servicio.pago_tecnico)).toEqual([2, 1, 100000, 1, 100000]);
		expect(Object.keys(datos.servicios[0]).sort()).toEqual(['id', 'fecha_programada', 'cliente_nombre', 'tipo', 'estado', 'valor_servicio', 'pago_tecnico'].sort());
		expect(JSON.stringify(datos)).not.toMatch(/comprobante|telefono|maquina|direccion|privado/);
		expect((await detalleFinanzas(4)).tecnico).toEqual({ id: 4, nombre: 'Inactivo', activo: 0 });
	});
	it('reasignación mueve monto y detalle sin cambiar total ni crear movimientos', async () => {
		const servicio = await escenario();
		const antes = await resumen();
		await detalle(await pedir('PATCH', `/${servicio.id}`, { tecnico_id: 3, confirmar_sobrecarga: true }));
		const despues = await resumen();
		expect(despues.resumen).toEqual(antes.resumen);
		expect(despues.tecnicos.find(tecnico => tecnico.id === 2)?.pago_generado).toBe(100001);
		expect(despues.tecnicos.find(tecnico => tecnico.id === 3)?.pago_generado).toBe(150002);
		expect((await detalleFinanzas(2)).servicios.some(fila => fila.id === servicio.id)).toBe(false);
		expect((await detalleFinanzas(3)).servicios.some(fila => fila.id === servicio.id)).toBe(true);
		expect(despues.tecnicos.map(tecnico => tecnico.id)).toEqual([3, 2, 4]);
	});
	it('desempate por nombre ASC y no por cantidad o ID', async () => {
		await operacion({ valor_servicio: 1000 });
		await operacion({ tecnico_id: 3, valor_servicio: 1000 });
		expect((await resumen()).tecnicos.map(tecnico => tecnico.nombre)).toEqual(['Carlos', 'Juan']);
	});
	it('histórico seis meses y comparación mes anterior usan datos actuales y ceros reales', async () => {
		await escenario();
		await operacion({ fecha_programada: '2026-05-10', valor_servicio: 1000 });
		await operacion({ fecha_programada: '2026-06-10', tipo: 'instalacion_remota', valor_servicio: null });
		await operacion({ fecha_programada: '2026-07-10', tipo: 'garantia', ciudad: 'Cali', direccion: 'Calle', valor_servicio: null });
		const historico = await operacion({ fecha_programada: '2026-09-10', valor_servicio: 1000 }, 'realizado');
		await operacion({ fecha_programada: '2026-04-30' });
		await operacion({ fecha_programada: '2026-11-01' });
		const datos = await resumen();
		expect(datos.historico).toEqual([
			{ mes: '2026-05', pago_generado: 400 }, { mes: '2026-06', pago_generado: 50000 },
			{ mes: '2026-07', pago_generado: 0 }, { mes: '2026-08', pago_generado: 0 },
			{ mes: '2026-09', pago_generado: 400 }, { mes: '2026-10', pago_generado: 250203 },
		]);
		expect(datos.comparacion).toMatchObject({ mes_anterior: '2026-09', pago_anterior: 400, diferencia: 249803 });
		expect(datos.comparacion.porcentaje).toBeCloseTo(62450.75, 8);
		await detalle(await pedir('PATCH', `/${historico.id}`, { tecnico_id: 3 }));
		expect((await resumen()).historico).toEqual(datos.historico);
		expect((await detalleFinanzas(2, '2026-09')).pago_generado).toBe(0);
		expect((await detalleFinanzas(3, '2026-09')).pago_generado).toBe(400);
	});
	it('histórico cruza de año y comparación evita NaN/Infinity si anterior cero', async () => {
		await operacion({ fecha_programada: '2026-01-10', valor_servicio: 1000 });
		const datos = await resumen('/resumen?mes=2026-01');
		expect(datos.historico.map(fila => fila.mes)).toEqual(['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01']);
		expect(datos.comparacion).toEqual({ mes_anterior: '2025-12', pago_anterior: 0, diferencia: 400, porcentaje: null });
	});
	it('sin datos o solo garantías devuelve ceros, lista vacía e histórico de seis meses', async () => {
		await operacion({ tipo: 'garantia', ciudad: 'Cali', direccion: 'Calle', valor_servicio: null });
		const datos = await resumen();
		expect(datos.resumen).toEqual({ pago_tecnicos: 0, servicios_con_pago: 0, tecnicos_con_actividad: 0, promedio_por_servicio: 0 });
		expect(datos.tecnicos).toEqual([]);
		expect(datos.historico).toHaveLength(6);
		expect(datos.historico.every(fila => fila.pago_generado === 0)).toBe(true);
		expect(datos.comparacion.porcentaje).toBeNull();
		expect((await detalleFinanzas(2)).servicios).toEqual([]);
	});
	it('filtros visuales no alteran KPIs ni histórico global', async () => {
		await escenario();
		expect(await resumen('/resumen?mes=2026-10&tecnico_id=3&estado=realizado&tipo=garantia&buscar=nada')).toEqual(await resumen());
	});
	it('el resumen no expone servicios sin agregar ni datos administrativos', async () => {
		await escenario();
		const json = JSON.stringify(await resumen());
		expect(json).not.toMatch(/cliente_nombre|cliente_telefono|comprobante|maquina|direccion|observaciones/);
	});
});
