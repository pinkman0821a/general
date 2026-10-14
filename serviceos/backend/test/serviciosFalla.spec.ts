import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crear, datos, detalle, error, lista, migrar, pedir, preparar } from './serviciosAyudas';

beforeAll(migrar);
beforeEach(preparar);

describe('Servicios: falla según tipo', () => {
	it.each(['instalacion', 'instalacion_remota'])('POST y PATCH %s terminan con falla NULL', async tipo => {
		const cambios = { tipo, valor_servicio: null,
			...(tipo === 'instalacion_remota' ? { ciudad: null, direccion: null } : {}) };
		for (const [indice, tipo_falla] of [undefined, null, '', 'Falla anterior'].entries()) {
			const servicio = await crear({ ...cambios, tipo_falla, fecha_programada: `2026-10-${15 + indice}` });
			expect(servicio.tipo_falla).toBeNull();
			expect((await detalle(await pedir('PATCH', `/${servicio.id}`, { tipo_falla: 'No corresponde' }))).tipo_falla).toBeNull();
		}
		expect((await lista('?buscar=Plotter')).length).toBe(4);
		expect(await lista('?buscar=Falla')).toEqual([]);
	});
	it.each(['garantia', 'servicio_presencial', 'servicio_remoto'])('%s exige falla', async tipo => {
		const cambios = { tipo, valor_servicio: tipo === 'garantia' ? null : 250000,
			...(tipo === 'servicio_remoto' ? { ciudad: null, direccion: null } : {}) };
		for (const tipo_falla of [undefined, null, '', ' \t ', 2]) {
			await error(await pedir('POST', '', { ...datos, ...cambios, tipo_falla }), 400);
		}
		const servicio = await crear(cambios);
		for (const tipo_falla of [null, '', ' \t ', 2]) await error(await pedir('PATCH', `/${servicio.id}`, { tipo_falla }), 400);
	});
	it('PATCH servicio a instalación limpia falla sin exigir un campo extra', async () => {
		const servicio = await crear();
		const actualizado = await detalle(await pedir('PATCH', `/${servicio.id}`, { tipo: 'instalacion', valor_servicio: null }));
		expect(actualizado).toMatchObject({ tipo: 'instalacion', tipo_falla: null, maquina: datos.maquina });
	});
	it.each(['instalacion', 'instalacion_remota'])('PATCH %s a servicio exige una falla nueva', async tipo => {
		const servicio = await crear({ tipo, valor_servicio: null,
			...(tipo === 'instalacion_remota' ? { ciudad: null, direccion: null } : {}) });
		const cambios = { tipo: 'servicio_presencial', ciudad: datos.ciudad, direccion: datos.direccion, valor_servicio: 250000 };
		await error(await pedir('PATCH', `/${servicio.id}`, cambios), 400);
		expect(await detalle(await pedir('GET', `/${servicio.id}`))).toEqual(servicio);
		expect((await detalle(await pedir('PATCH', `/${servicio.id}`, { ...cambios, tipo_falla: ' Nueva falla ' }))).tipo_falla).toBe('Nueva falla');
	});
});
