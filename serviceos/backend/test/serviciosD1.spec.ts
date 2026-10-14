import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { datos, migrar, preparar, remoto } from './serviciosAyudas';

beforeAll(migrar);
beforeEach(preparar);

function insertar(cambios: Record<string, unknown> = {}) {
	const valores: Record<string, unknown> = { ...datos, ...cambios };
	return env.DB.prepare(`INSERT INTO servicios (${Object.keys(valores).join(', ')}) VALUES (${Object.keys(valores).map(() => '?').join(', ')})`)
		.bind(...Object.values(valores)).run();
}
async function rechazar(cambios: Record<string, unknown>, patron = /CHECK constraint failed|NOT NULL constraint failed/) {
	await expect(insertar(cambios)).rejects.toThrow(patron);
	await insertar();
	await expect(env.DB.prepare(`UPDATE servicios SET ${Object.keys(cambios).map(c => `${c} = ?`).join(', ')}`)
		.bind(...Object.values(cambios)).run()).rejects.toThrow(patron);
}

describe('Servicios: restricciones D1 directas', () => {
	it.each(['taller', 'cancelado', '', null])('CHECK tipo %j en insert y update', async tipo => { await rechazar({ tipo }); });
	it.each(['cancelado', '', null])('CHECK estado %j en insert y update', async estado => { await rechazar({ estado }); });
	it.each(['20261015', '2026-1-15', '2026-10-1', '2026-10-15 ', '2026-02-30', '2026-02-29',
		'1900-02-29', '2100-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-10-00', '0000-01-01', null])(
		'CHECK fecha real %j en insert y update', async fecha_programada => { await rechazar({ fecha_programada }); });
	it.each(['2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31'])('acepta fecha %s', async fecha_programada => { await insertar({ fecha_programada }); });
	it.each(['cliente_nombre', 'cliente_telefono', 'maquina', 'tipo_falla'])('CHECK requerido %s', async campo => {
		for (const valor of ['', ' ', '\tTexto', 'Texto\n', '\u00a0Texto', 'Texto\ufeff', null]) {
			await expect(insertar({ [campo]: valor })).rejects.toThrow(/CHECK constraint failed|NOT NULL constraint failed/);
		}
		await insertar();
		await expect(env.DB.prepare(`UPDATE servicios SET ${campo} = ''`).run()).rejects.toThrow(/CHECK constraint failed/);
	});
	it.each(['ciudad', 'direccion', 'tarjeteria', 'cabezal', 'observaciones'])('CHECK opcional %s', async campo => {
		for (const valor of ['', ' ', '\tTexto', 'Texto\n', '\u2003Texto', 'Texto\ufeff']) {
			await expect(insertar({ [campo]: valor })).rejects.toThrow(/CHECK constraint failed/);
		}
		await insertar();
		await expect(env.DB.prepare(`UPDATE servicios SET ${campo} = ' Texto'`).run()).rejects.toThrow(/CHECK constraint failed/);
	});
	it.each(['garantia', 'servicio_presencial', 'instalacion'])('exige ubicación en %s', async tipo => {
		for (const campo of ['ciudad', 'direccion']) await expect(insertar({ tipo, tipo_falla: tipo === 'instalacion' ? null : datos.tipo_falla,
			valor_servicio: tipo === 'servicio_presencial' ? 1 : null, [campo]: null })).rejects.toThrow(/CHECK constraint failed/);
		await insertar();
		await expect(env.DB.prepare('UPDATE servicios SET ciudad = NULL').run()).rejects.toThrow(/CHECK constraint failed/);
	});
	it.each(['servicio_remoto', 'instalacion_remota'])('prohíbe ubicación en %s', async tipo => {
		await rechazar({ tipo, tipo_falla: tipo === 'instalacion_remota' ? null : datos.tipo_falla, valor_servicio: tipo === 'servicio_remoto' ? 1 : null });
	});
	it.each([null, 0, -1, 1.5, 'abc'])('CHECK valor de servicio %j', async valor_servicio => { await rechazar({ valor_servicio }); });
	it.each(['garantia', 'instalacion', 'instalacion_remota'])('prohíbe valor manual en %s', async tipo => {
		await rechazar({ tipo, tipo_falla: tipo === 'garantia' ? datos.tipo_falla : null,
			...(tipo === 'instalacion_remota' ? { ciudad: null, direccion: null } : {}) });
	});
	it('FK impide técnico inexistente, nulo y borrar historial', async () => {
		await rechazar({ tecnico_id: 99 }, /FOREIGN KEY constraint failed/);
		await expect(env.DB.prepare('DELETE FROM usuarios WHERE id = 2').run()).rejects.toThrow(/FOREIGN KEY constraint failed/);
		await expect(env.DB.prepare('UPDATE servicios SET tecnico_id = NULL').run()).rejects.toThrow(/NOT NULL constraint failed/);
	});
	it('permite varios presenciales en la misma fecha al insertar y actualizar', async () => {
		await insertar(); await insertar({ tipo: 'garantia', valor_servicio: null });
		await insertar(remoto); await insertar(remoto); await insertar({ tecnico_id: 3 });
		await env.DB.prepare('UPDATE servicios SET tecnico_id = 2 WHERE tecnico_id = 3').run();
		await env.DB.prepare("UPDATE servicios SET tipo = 'servicio_presencial', ciudad = 'Ciudad', direccion = 'Carrera' WHERE tipo = 'servicio_remoto'").run();
		await insertar({ fecha_programada: '2026-10-16' });
		await env.DB.prepare("UPDATE servicios SET fecha_programada = '2026-10-15' WHERE fecha_programada = '2026-10-16'").run();
		expect(await env.DB.prepare("SELECT count(*) AS cantidad FROM servicios WHERE tecnico_id = 2 AND fecha_programada = '2026-10-15'").first())
			.toEqual({ cantidad: 6 });
	});
	it('permite escrituras presenciales concurrentes directas sin UNIQUE', async () => {
		await Promise.all([insertar(), insertar()]);
		expect(await env.DB.prepare('SELECT count(*) AS cantidad FROM servicios').first()).toEqual({ cantidad: 2 });
	});
	it('mantiene el indice normal por tecnico y fecha y no persiste confirmacion', async () => {
		const indices = (await env.DB.prepare("PRAGMA index_list('servicios')").all<{ name: string; unique: number }>()).results;
		expect(indices.find(i => i.name === 'idx_servicios_tecnico_fecha')).toMatchObject({ unique: 0 });
		expect(indices.every(i => i.unique === 0)).toBe(true);
		const columnas = (await env.DB.prepare("PRAGMA table_info('servicios')").all<{ name: string }>()).results;
		expect(columnas.some(c => c.name === 'confirmar_sobrecarga')).toBe(false);
	});
	it('defaults, opcionales nulos, estados y tipos exactos', async () => {
		for (const [indice, tipo] of ['garantia', 'servicio_presencial', 'servicio_remoto', 'instalacion', 'instalacion_remota'].entries()) {
			await insertar({ tipo, fecha_programada: `2026-10-${15 + indice}`, valor_servicio: tipo.startsWith('servicio_') ? 1 : null,
				tipo_falla: tipo === 'instalacion' || tipo === 'instalacion_remota' ? null : datos.tipo_falla,
				...(tipo === 'servicio_remoto' || tipo === 'instalacion_remota' ? { ciudad: null, direccion: null } : {}) });
		}
		expect(await env.DB.prepare('SELECT estado, tarjeteria, cabezal, observaciones, created_at, updated_at FROM servicios LIMIT 1').first()).toEqual({
			estado: 'pendiente', tarjeteria: null, cabezal: null, observaciones: null, created_at: expect.any(String), updated_at: expect.any(String),
		});
		for (const estado of ['pendiente', 'en_proceso', 'realizado']) await env.DB.prepare('UPDATE servicios SET estado = ?').bind(estado).run();
	});
	it.each(['instalacion', 'instalacion_remota'])('permite solo falla NULL en %s, INSERT y UPDATE', async tipo => {
		const cambios = { tipo, tipo_falla: null, valor_servicio: null,
			...(tipo === 'instalacion_remota' ? { ciudad: null, direccion: null } : {}) };
		await insertar(cambios);
		await insertar({ fecha_programada: '2026-10-16' });
		await env.DB.prepare('UPDATE servicios SET tipo = ?, tipo_falla = NULL, valor_servicio = NULL, ciudad = ?, direccion = ?')
			.bind(tipo, tipo === 'instalacion' ? datos.ciudad : null, tipo === 'instalacion' ? datos.direccion : null).run();
		for (const falla of ['', 'Falla inventada', ' ', '\t']) {
			await expect(insertar({ ...cambios, tipo_falla: falla })).rejects.toThrow(/CHECK constraint failed/);
			await expect(env.DB.prepare('UPDATE servicios SET tipo_falla = ?').bind(falla).run()).rejects.toThrow(/CHECK constraint failed/);
		}
	});
	it.each(['garantia', 'servicio_presencial', 'servicio_remoto'])('exige falla válida en %s, INSERT y UPDATE', async tipo => {
		const cambios = { tipo, valor_servicio: tipo === 'garantia' ? null : 250000,
			...(tipo === 'servicio_remoto' ? { ciudad: null, direccion: null } : {}) };
		for (const tipo_falla of [null, '', ' ', '\tTexto', 'Texto\n', '\u00a0Texto']) {
			await expect(insertar({ ...cambios, tipo_falla })).rejects.toThrow(/CHECK constraint failed/);
		}
		await insertar(cambios);
		await expect(env.DB.prepare('UPDATE servicios SET tipo_falla = NULL').run()).rejects.toThrow(/CHECK constraint failed/);
	});
});
