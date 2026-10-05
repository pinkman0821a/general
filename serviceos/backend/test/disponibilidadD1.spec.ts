import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { migrar, preparar } from './disponibilidadAyudas';

beforeAll(migrar);
beforeEach(async () => { await preparar(); });

function insertar(fecha: string | null, motivo: string | null = null, tecnicoId = 2) {
	return env.DB.prepare('INSERT INTO tecnico_indisponibilidades (tecnico_id, fecha, motivo) VALUES (?, ?, ?)')
		.bind(tecnicoId, fecha, motivo).run();
}

describe('Disponibilidad: restricciones D1 directas', () => {
	it('acepta motivos nulos o recortados y genera ID y timestamp', async () => {
		await insertar('2026-10-12');
		await insertar('2026-10-13', 'Viaje de trabajo');
		expect((await env.DB.prepare('SELECT * FROM tecnico_indisponibilidades ORDER BY fecha').all()).results)
			.toEqual([
				{ id: expect.any(Number), tecnico_id: 2, fecha: '2026-10-12', motivo: null, created_at: expect.any(String) },
				{ id: expect.any(Number), tecnico_id: 2, fecha: '2026-10-13', motivo: 'Viaje de trabajo', created_at: expect.any(String) },
			]);
	});
	it.each([' Viaje', 'Viaje ', '', '   ', '\tViaje', 'Viaje\n', '\t\r\n', '\u00a0', '\u2003Viaje', 'Viaje\ufeff'])(
		'rechaza motivo inválido %j al insertar y actualizar', async (motivo) => {
			await expect(insertar('2026-10-12', motivo)).rejects.toThrow(/CHECK constraint failed/);
			await insertar('2026-10-12', 'Viaje');
			await expect(env.DB.prepare('UPDATE tecnico_indisponibilidades SET motivo = ?')
				.bind(motivo).run()).rejects.toThrow(/CHECK constraint failed/);
		},
	);
	it.each(['', '20261012', '12/10/2026', '2026-1-12', '2026-10-1', '2026-10-12 ',
		'2026-10-12T00:00:00Z', '2026-02-30', '2026-02-29', '1900-02-29', '2100-02-29',
		'2026-04-31', '2026-00-12', '2026-13-12', '2026-10-00', '2026-10-32', '0000-01-01'])(
		'rechaza fecha inválida %j al insertar y actualizar', async (fecha) => {
			await expect(insertar(fecha)).rejects.toThrow(/CHECK constraint failed/);
			await insertar('2026-10-12');
			await expect(env.DB.prepare('UPDATE tecnico_indisponibilidades SET fecha = ?')
				.bind(fecha).run()).rejects.toThrow(/CHECK constraint failed/);
		},
	);
	it.each(['2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31'])(
		'acepta directamente fecha válida %s', async (fecha) => {
			await insertar(fecha);
			expect(await env.DB.prepare('SELECT fecha FROM tecnico_indisponibilidades').first()).toEqual({ fecha });
		},
	);
	it('impide duplicados al insertar y actualizar, permitiendo la misma fecha para otro técnico', async () => {
		await insertar('2026-10-12');
		await expect(insertar('2026-10-12')).rejects.toThrow(/UNIQUE constraint failed/);
		await insertar('2026-10-12', null, 3);
		await insertar('2026-10-13');
		await expect(env.DB.prepare("UPDATE tecnico_indisponibilidades SET fecha = '2026-10-12' WHERE fecha = '2026-10-13'")
			.run()).rejects.toThrow(/UNIQUE constraint failed/);
	});
	it('exige fecha y técnico, y rechaza referencias inexistentes', async () => {
		await expect(insertar(null)).rejects.toThrow(/NOT NULL constraint failed/);
		await expect(env.DB.prepare("INSERT INTO tecnico_indisponibilidades (fecha) VALUES ('2026-10-12')")
			.run()).rejects.toThrow(/NOT NULL constraint failed/);
		await expect(insertar('2026-10-12', null, 99)).rejects.toThrow(/FOREIGN KEY constraint failed/);
		await insertar('2026-10-12');
		await expect(env.DB.prepare('UPDATE tecnico_indisponibilidades SET tecnico_id = 99')
			.run()).rejects.toThrow(/FOREIGN KEY constraint failed/);
	});
	it('elimina excepciones en cascada sin afectar las de otro técnico', async () => {
		await insertar('2026-10-12');
		await insertar('2026-10-12', null, 3);
		await env.DB.prepare('DELETE FROM usuarios WHERE id = 2').run();
		expect((await env.DB.prepare('SELECT tecnico_id FROM tecnico_indisponibilidades').all()).results)
			.toEqual([{ tecnico_id: 3 }]);
	});
});
