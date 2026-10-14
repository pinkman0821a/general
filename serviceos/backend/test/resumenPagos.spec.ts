import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cookies, crear, detalle, error, migrar, pedir, preparar, remoto } from './serviciosAyudas';

beforeAll(migrar);
beforeEach(preparar);

describe('Pago técnicos del mes', () => {
	it('suma todos, independientemente del estado y filtros visuales', async () => {
		await crear({ valor_servicio: 250001 });
		const proceso = await crear({ ...remoto, tecnico_id: 3, valor_servicio: 4 });
		await detalle(await pedir('PATCH', `/${proceso.id}/estado`, { estado: 'en_proceso' }));
		const instalacion = await crear({ tipo: 'instalacion', valor_servicio: null, fecha_programada: '2026-10-16' });
		await detalle(await pedir('PATCH', `/${instalacion.id}/estado`, { estado: 'realizado' }));
		await crear({ tipo: 'instalacion_remota', valor_servicio: null, ciudad: null, direccion: null, tecnico_id: 3 });
		await crear({ tipo: 'garantia', valor_servicio: null, fecha_programada: '2026-10-17' });
		await crear({ ...remoto, valor_servicio: 900000, fecha_programada: '2026-09-30' });
		for (const filtros of ['', '&estado=realizado&tipo=garantia&tecnico_id=3&buscar=nada']) {
			const respuesta = await pedir('GET', `/resumen-pagos?mes=2026-10${filtros}`);
			expect(respuesta.status).toBe(200);
			expect(await respuesta.json()).toEqual({ status: 'ok', mes: '2026-10', pago_tecnicos: 250002 });
		}
		expect(await (await pedir('GET', '/resumen-pagos?mes=2026-09')).json()).toMatchObject({ pago_tecnicos: 360000 });
	});
	it('mes sin operaciones vale cero; técnico no recibe métrica', async () => {
		expect(await (await pedir('GET', '/resumen-pagos?mes=2026-10')).json()).toMatchObject({ pago_tecnicos: 0 });
		await error(await pedir('GET', '/resumen-pagos?mes=2026-10', undefined, cookies.tecnico), 403);
		await error(await pedir('GET', '/resumen-pagos?mes=2026-13'), 400);
	});
});
