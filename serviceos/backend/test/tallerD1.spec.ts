import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { camposOpcionales, camposRecepcion, camposRequeridos } from '../src/services/tallerValidacion';
import { fechasInvalidas, ingreso, migrarTaller, prepararTaller } from './tallerAyudas';

beforeAll(migrarTaller);
beforeEach(async () => { await prepararTaller(); });

async function insertar(datos: Record<string, unknown> = {}) {
	const body: Record<string, unknown> = { ...ingreso, ...datos };
	const resultado = await env.DB.prepare(`INSERT INTO taller_recepciones (${camposRecepcion.join(', ')})
		VALUES (${camposRecepcion.map(() => '?').join(', ')}) RETURNING id`)
		.bind(...camposRecepcion.map((campo) => body[campo] ?? null)).first<{ id: number }>();
	return resultado!.id;
}

function accesorio(id: number, nombre: string | null = 'Cable', devuelto: number | null = 0) {
	return env.DB.prepare('INSERT INTO taller_accesorios (recepcion_id, nombre, devuelto) VALUES (?, ?, ?)')
		.bind(id, nombre, devuelto).run();
}

describe('Taller: restricciones D1 de recepción', () => {
	it('genera IDs y timestamps, acepta nulos y no almacena estado', async () => {
		const id = await insertar();
		expect(await env.DB.prepare('SELECT * FROM taller_recepciones WHERE id = ?').bind(id).first())
			.toMatchObject({ id, fecha_entrega: null, cliente_contacto: null,
				created_at: expect.any(String), updated_at: expect.any(String) });
		const columnas = await env.DB.prepare('PRAGMA table_info(taller_recepciones)').all<{ name: string }>();
		expect(columnas.results.map((c) => c.name)).not.toContain('estado');
	});
	it.each([...camposRequeridos, ...camposOpcionales])('CHECK de texto %s al insertar y actualizar', async (campo) => {
		const id = await insertar();
		for (const valor of ['', ' ', '\tCable', 'Cable\n', '\u00a0', '\u2003Cable', 'Cable\ufeff']) {
			await expect(insertar({ [campo]: valor })).rejects.toThrow(/CHECK constraint failed/);
			await expect(env.DB.prepare(`UPDATE taller_recepciones SET ${campo} = ? WHERE id = ?`)
				.bind(valor, id).run()).rejects.toThrow(/CHECK constraint failed/);
		}
		await env.DB.prepare(`UPDATE taller_recepciones SET ${campo} = 'Texto válido' WHERE id = ?`).bind(id).run();
	});
	it.each(['fecha_ingreso', ...camposRequeridos])('exige NOT NULL para %s', async (campo) => {
		await expect(insertar({ [campo]: null })).rejects.toThrow(/NOT NULL constraint failed/);
	});
	it.each(fechasInvalidas)('CHECK de ambas fechas %j al insertar y actualizar', async (fecha) => {
		await expect(insertar({ fecha_ingreso: fecha })).rejects.toThrow(/CHECK constraint failed/);
		const id = await insertar({ fecha_ingreso: '0001-01-01' });
		for (const campo of ['fecha_ingreso', 'fecha_entrega']) {
			await expect(env.DB.prepare(`UPDATE taller_recepciones SET ${campo} = ? WHERE id = ?`)
				.bind(fecha, id).run()).rejects.toThrow(/CHECK constraint failed/);
		}
		await expect(env.DB.prepare(`INSERT INTO taller_recepciones
			(fecha_ingreso, cliente_nombre, cliente_telefono, maquina_tipo, falla_reportada, fecha_entrega)
			VALUES ('0001-01-01', 'Cliente', '300', 'Laser', 'Falla', ?)`).bind(fecha).run())
			.rejects.toThrow(/CHECK constraint failed/);
	});
	it.each(['2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31'])(
		'acepta ambas fechas reales %s', async (fecha) => {
			const id = await insertar({ fecha_ingreso: fecha });
			await env.DB.prepare('UPDATE taller_recepciones SET fecha_entrega = ? WHERE id = ?').bind(fecha, id).run();
		},
	);
	it('impide inversión de fechas por cambios de entrega o ingreso', async () => {
		const id = await insertar();
		await expect(env.DB.prepare("UPDATE taller_recepciones SET fecha_entrega = '2026-10-08' WHERE id = ?")
			.bind(id).run()).rejects.toThrow(/CHECK constraint failed/);
		await env.DB.prepare("UPDATE taller_recepciones SET fecha_entrega = '2026-10-14' WHERE id = ?").bind(id).run();
		await expect(env.DB.prepare("UPDATE taller_recepciones SET fecha_ingreso = '2026-10-15' WHERE id = ?")
			.bind(id).run()).rejects.toThrow(/CHECK constraint failed/);
	});
});

describe('Taller: restricciones D1 de accesorios', () => {
	it('default de devolución, FK y cascada aíslan recepciones', async () => {
		const primera = await insertar();
		const otra = await insertar();
		await env.DB.prepare("INSERT INTO taller_accesorios (recepcion_id, nombre) VALUES (?, 'Cable')").bind(primera).run();
		await accesorio(otra);
		expect(await env.DB.prepare('SELECT devuelto, created_at FROM taller_accesorios WHERE recepcion_id = ?')
			.bind(primera).first()).toEqual({ devuelto: 0, created_at: expect.any(String) });
		await expect(accesorio(99999)).rejects.toThrow(/FOREIGN KEY constraint failed/);
		await expect(env.DB.prepare('UPDATE taller_accesorios SET recepcion_id = 99999 WHERE recepcion_id = ?')
			.bind(primera).run())
			.rejects.toThrow(/FOREIGN KEY constraint failed/);
		await env.DB.prepare('DELETE FROM taller_recepciones WHERE id = ?').bind(primera).run();
		expect((await env.DB.prepare('SELECT recepcion_id FROM taller_accesorios').all()).results).toEqual([{ recepcion_id: otra }]);
	});
	it.each(['', ' ', '\tCable', 'Cable\n', '\u00a0', '\u2003Cable', 'Cable\ufeff'])(
		'CHECK de nombre %j en inserción y actualización', async (nombre) => {
			const id = await insertar();
			await expect(accesorio(id, nombre)).rejects.toThrow(/CHECK constraint failed/);
			await accesorio(id);
			await expect(env.DB.prepare('UPDATE taller_accesorios SET nombre = ?').bind(nombre).run())
				.rejects.toThrow(/CHECK constraint failed/);
		},
	);
	it.each([-1, 2, 0.5, 10])('CHECK de devuelto %j en inserción y actualización', async (devuelto) => {
		const id = await insertar();
		await expect(accesorio(id, 'Cable', devuelto)).rejects.toThrow(/CHECK constraint failed/);
		await accesorio(id);
		await expect(env.DB.prepare('UPDATE taller_accesorios SET devuelto = ?').bind(devuelto).run())
			.rejects.toThrow(/CHECK constraint failed/);
	});
	it('exige nombre, devolución y recepción', async () => {
		const id = await insertar();
		await expect(accesorio(id, null)).rejects.toThrow(/NOT NULL constraint failed/);
		await expect(accesorio(id, 'Cable', null)).rejects.toThrow(/NOT NULL constraint failed/);
		await expect(env.DB.prepare("INSERT INTO taller_accesorios (nombre) VALUES ('Cable')").run())
			.rejects.toThrow(/NOT NULL constraint failed/);
	});
	it('impide duplicados case-insensitive al insertar y actualizar dentro de una recepción', async () => {
		const id = await insertar();
		await accesorio(id, 'Cable USB');
		await expect(accesorio(id, 'cAbLe uSb')).rejects.toThrow(/UNIQUE constraint failed/);
		await accesorio(id, 'Fuente', 1);
		await expect(env.DB.prepare("UPDATE taller_accesorios SET nombre = 'CABLE USB' WHERE nombre = 'Fuente'").run())
			.rejects.toThrow(/UNIQUE constraint failed/);
		await accesorio(await insertar(), 'cable usb');
	});
	it('batch revierte toda la edición si falla una restricción de accesorios', async () => {
		const id = await insertar();
		await accesorio(id);
		await expect(env.DB.batch([
			env.DB.prepare("UPDATE taller_recepciones SET cliente_nombre = 'No guardar' WHERE id = ?").bind(id),
			env.DB.prepare("DELETE FROM taller_accesorios WHERE recepcion_id = ?").bind(id),
			env.DB.prepare("INSERT INTO taller_accesorios (recepcion_id, nombre) VALUES (?, '')").bind(id),
		])).rejects.toThrow(/CHECK constraint failed/);
		expect(await env.DB.prepare('SELECT cliente_nombre FROM taller_recepciones WHERE id = ?').bind(id).first())
			.toEqual({ cliente_nombre: ingreso.cliente_nombre });
		expect((await env.DB.prepare('SELECT nombre FROM taller_accesorios WHERE recepcion_id = ?').bind(id).all()).results)
			.toEqual([{ nombre: 'Cable' }]);
	});
});
