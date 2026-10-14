import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cookies, crear, detalle, error, migrar, pedir, preparar, remoto } from './serviciosAyudas';
import { normalizarTrabajo, productoComision } from '../src/services/servicioTrabajo';
import { env } from 'cloudflare:workers';

beforeAll(migrar);
beforeEach(preparar);

describe('Trabajo realizado: permisos y reglas de finalización', () => {
	it.each([{}, remoto])('creación opcional y finalización exige concepto %j', async cambios => {
		const servicio = await crear(cambios);
		expect(servicio.trabajo_realizado).toBeNull();
		const respuesta = await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }, cookies.tecnico);
		expect(respuesta.status).toBe(400);
		expect(await respuesta.json()).toMatchObject({ message: 'Indica el trabajo realizado antes de completar el servicio.' });
		expect((await detalle(await pedir('GET', `/${servicio.id}`))).estado).toBe('pendiente');
	});
	it('técnico guarda concepto propio y luego completa, coordinador lo edita', async () => {
		const servicio = await crear();
		expect(await detalle(await pedir('PATCH', `/${servicio.id}/estado`, {
			estado: 'pendiente', trabajo_realizado: '  calibración   presencial  ',
		}, cookies.tecnico))).toMatchObject({ trabajo_realizado: 'CALIBRACION', estado: 'pendiente' });
		expect(await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }, cookies.tecnico)))
			.toMatchObject({ trabajo_realizado: 'CALIBRACION', estado: 'realizado' });
		expect(await detalle(await pedir('PATCH', `/${servicio.id}`, { trabajo_realizado: ' Mantenimiento ' })))
			.toMatchObject({ trabajo_realizado: 'MANTENIMIENTO' });
		await error(await pedir('PATCH', `/${servicio.id}`, { trabajo_realizado: null }), 400);
	});
	it('coordinador define concepto antes de completar', async () => {
		const servicio = await crear();
		await detalle(await pedir('PATCH', `/${servicio.id}`, { trabajo_realizado: 'Revisión' }));
		expect((await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }))).estado).toBe('realizado');
	});
	it('ajeno no puede escribir concepto', async () => {
		const ajeno = await crear({ tecnico_id: 3 });
		await error(await pedir('PATCH', `/${ajeno.id}/estado`, { estado: 'realizado', trabajo_realizado: 'REVISION' }, cookies.tecnico), 403);
		await error(await pedir('PATCH', `/${ajeno.id}`, { trabajo_realizado: 'REVISION' }, cookies.tecnico), 403);
		expect((await detalle(await pedir('GET', `/${ajeno.id}`))).trabajo_realizado).toBeNull();
	});
	it.each(['cliente_nombre', 'cliente_telefono', 'fecha_programada', 'valor_servicio', 'tecnico_id', 'maquina', 'ciudad',
		'direccion', 'comprobante_key', 'observaciones', 'tipo', 'tarjeteria', 'cabezal', 'tipo_falla'])('técnico no edita %s', async campo => {
		const servicio = await crear();
		await error(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado', trabajo_realizado: 'REVISION', [campo]: 'otro' }, cookies.tecnico), 400);
		await error(await pedir('PATCH', `/${servicio.id}`, { [campo]: 'otro' }, cookies.tecnico), 403);
		expect(await detalle(await pedir('GET', `/${servicio.id}`))).toEqual(servicio);
	});
	it.each(['instalacion', 'instalacion_remota', 'garantia'])('%s no requiere concepto', async tipo => {
		const servicio = await crear({ tipo, valor_servicio: null,
			...(tipo === 'instalacion_remota' ? { ciudad: null, direccion: null } : {}) });
		expect((await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }, cookies.tecnico))).estado).toBe('realizado');
	});
	it.each([22, true, {}, 'A'.repeat(201)])('rechaza concepto inválido %j', async trabajo_realizado => {
		await error(await pedir('POST', '', { trabajo_realizado }), 400);
		const servicio = await crear();
		await error(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado', trabajo_realizado }), 400);
	});
	it('normaliza espacios, acentos y sufijos equivalentes sin duplicación', () => {
		expect(normalizarTrabajo('REMOTA')).toBeNull();
		expect(normalizarTrabajo('  instalación   programa y perfiles remota REMOTO ')).toBe('INSTALACION PROGRAMA Y PERFILES');
		expect(productoComision('servicio_remoto', 'calibración remota')).toBe('CALIBRACION REMOTA');
		expect(productoComision('servicio_presencial', 'revision presencial')).toBe('REVISION PRESENCIAL');
		expect(productoComision('instalacion', null)).toBe('INSTALACION PRESENCIAL');
		expect(productoComision('instalacion_remota', null)).toBe('INSTALACION REMOTA');
	});
	it('conserva compatibilidad de realizados históricos con concepto NULL', async () => {
		const servicio = await crear();
		await env.DB.prepare("UPDATE servicios SET estado = 'realizado' WHERE id = ?").bind(servicio.id).run();
		expect(await detalle(await pedir('PATCH', `/${servicio.id}`, { observaciones: 'Histórico' })))
			.toMatchObject({ estado: 'realizado', trabajo_realizado: null, observaciones: 'Histórico' });
		await error(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }, cookies.tecnico), 400);
	});
});
