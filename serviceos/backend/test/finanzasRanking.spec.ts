import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { cookies, crear, detalle, migrar, pedir, preparar, remoto } from './serviciosAyudas';
import { consultarFinanzas, consultarDetalleFinanzas, consultarResumenPersonal, mesActualFinanciero } from '../src/services/finanzasConsulta';
import { pagoTecnico } from '../src/services/serviciosValidacion';

beforeAll(migrar);
beforeEach(preparar);
async function operacion(cambios: Record<string, unknown> = {}) {
	return crear({ ...remoto, confirmar_sobrecarga: true, ...cambios });
}
function personal(consulta = '', cookie = cookies.tecnico) {
	return SELF.fetch(`https://example.com/api/tecnico/resumen-financiero${consulta}`, { headers: { Cookie: cookie } });
}

it('regresión: 80000 + 100000 + 50000 son 230000 numéricos en resumen, ranking, detalle y personal', async () => {
	const mes = mesActualFinanciero();
	await operacion({ valor_servicio: 200000, fecha_programada: `${mes}-10` });
	await operacion({ tipo: 'instalacion', valor_servicio: null, ciudad: 'Cali', direccion: 'Calle', fecha_programada: `${mes}-11` });
	await operacion({ tipo: 'instalacion_remota', valor_servicio: null, fecha_programada: `${mes}-12` });
	const datos = await consultarFinanzas(env, mes);
	expect(datos.resumen.pago_tecnicos).toBe(230000);
	expect(datos.historico_tecnicos[0].tecnicos[0].pago_generado).toBe(230000);
	expect((await consultarDetalleFinanzas(env, mes, 2)).servicios.map(s => s.pago_tecnico)).toEqual([80000, 100000, 50000]);
	expect((await consultarDetalleFinanzas(env, mes, 2)).pago_generado).toBe(230000);
	expect(await (await personal()).json()).toEqual({ mes, pago_generado: 230000, servicios_con_pago: 3 });
});

it('reproduce exactamente el monto reportado: valor enorme almacenado, sin concatenación', () => {
	const valores = [214256756534232, 1233453, 1234567].map(valor_servicio => pagoTecnico({ tipo: 'servicio_remoto', valor_servicio }));
	expect(valores.reduce((total, valor) => total + valor, 100000)).toBe(85702703700901);
});

it('rankings independientes de seis meses, ceros omitidos, inactivos históricos y cambio dinámico de posición', async () => {
	const primero = await operacion({ valor_servicio: 1250000 });
	await operacion({ tecnico_id: 3, valor_servicio: 1000000 });
	await operacion({ tecnico_id: 3, fecha_programada: '2026-09-01', valor_servicio: 1000000 });
	await operacion({ tipo: 'garantia', valor_servicio: null, ciudad: 'Cali', direccion: 'Calle' });
	await env.DB.prepare('UPDATE usuarios SET activo = 0 WHERE id = 3').run();
	let datos = await consultarFinanzas(env, '2026-10');
	expect(datos.historico_tecnicos.map(m => m.mes)).toEqual(['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05']);
	expect(datos.historico_tecnicos[0].tecnicos.map(t => t.id)).toEqual([2, 3]);
	expect(datos.historico_tecnicos[1].tecnicos.map(t => [t.id, t.activo])).toEqual([[3, 0]]);
	expect(datos.historico_tecnicos.slice(2).every(m => !m.tecnicos.length)).toBe(true);
	await env.DB.prepare('UPDATE usuarios SET activo = 1 WHERE id = 3').run();
	await operacion({ tecnico_id: 3, valor_servicio: 375000 });
	expect((await consultarFinanzas(env, '2026-10')).historico_tecnicos[0].tecnicos.map(t => t.id)).toEqual([3, 2]);
	await detalle(await pedir('PATCH', `/${primero.id}`, { tecnico_id: 3 }));
	datos = await consultarFinanzas(env, '2026-10');
	expect(datos.historico_tecnicos[0].tecnicos.map(t => t.id)).toEqual([3]);
});

it('desempate nombre ASC y todos los estados aportan al resumen propio sin garantías ni otros técnicos', async () => {
	const mes = mesActualFinanciero();
	for (const estado of ['pendiente', 'en_proceso', 'realizado']) {
		const servicio = await operacion({ valor_servicio: 200000, fecha_programada: `${mes}-10` });
		if (estado !== 'pendiente') await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado }));
	}
	await operacion({ tecnico_id: 3, valor_servicio: 600000, fecha_programada: `${mes}-10` });
	await operacion({ tipo: 'garantia', valor_servicio: null, ciudad: 'Cali', direccion: 'Calle', fecha_programada: `${mes}-10` });
	expect((await consultarFinanzas(env, mes)).historico_tecnicos[0].tecnicos.map(t => t.nombre)).toEqual(['Carlos', 'Juan']);
	expect(await consultarResumenPersonal(env, 2, mes)).toEqual({ mes, pago_generado: 240000, servicios_con_pago: 3 });
	expect(await (await personal()).json()).toEqual({ mes, pago_generado: 240000, servicios_con_pago: 3 });
});

it('endpoint personal exige técnico autenticado y rechaza identidad o mes de frontend', async () => {
	expect((await personal('', '')).status).toBe(401);
	expect((await personal('', cookies.coordinador)).status).toBe(403);
	expect((await personal('?tecnico_id=3')).status).toBe(400);
	expect((await personal('?mes=2026-09')).status).toBe(400);
	expect(await (await personal()).json()).toEqual({ mes: mesActualFinanciero(), pago_generado: 0, servicios_con_pago: 0 });
});

it('mes personal usa Bogotá en el cambio de mes UTC', () => {
	expect(mesActualFinanciero(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10');
	expect(mesActualFinanciero(new Date('2026-11-01T05:00:00Z'))).toBe('2026-11');
});
