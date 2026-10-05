import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { migrarTaller } from './tallerAyudas';

beforeAll(async () => {
  await migrarTaller();
  // Se comprueba antes de limpiar datos: la migración no debe insertar presets.
  expect(await env.DB.prepare('SELECT COUNT(*) AS total FROM taller_catalogo_accesorios').first())
    .toEqual({ total: 0 });
});
beforeEach(async () => { await env.DB.prepare('DELETE FROM taller_catalogo_accesorios').run(); });

function insertar(nombre: string | null) {
  return env.DB.prepare('INSERT INTO taller_catalogo_accesorios (nombre) VALUES (?)').bind(nombre).run();
}

describe('Catálogo de Taller: restricciones D1 directas', () => {
  it.each(['', ' ', '\t', '\nCable', 'Cable ', 'Cable\n', '\u00a0', '\u2003Cable', 'Cable\ufeff'])(
    'rechaza nombre vacío o sin recortar %j en INSERT y UPDATE', async (nombre) => {
      await expect(insertar(nombre)).rejects.toThrow(/CHECK constraint failed/);
      await insertar('Cable');
      await expect(env.DB.prepare('UPDATE taller_catalogo_accesorios SET nombre = ?').bind(nombre).run())
        .rejects.toThrow(/CHECK constraint failed/);
    },
  );
  it('rechaza null o ausencia de nombre', async () => {
    await expect(insertar(null)).rejects.toThrow(/NOT NULL constraint failed/);
    await expect(env.DB.prepare('INSERT INTO taller_catalogo_accesorios DEFAULT VALUES').run())
      .rejects.toThrow(/NOT NULL constraint failed/);
    await insertar('Cable');
    await expect(env.DB.prepare('UPDATE taller_catalogo_accesorios SET nombre = NULL').run())
      .rejects.toThrow(/NOT NULL constraint failed/);
  });
  it('impide duplicados case-insensitive por INSERT y UPDATE', async () => {
    await insertar('Cable USB');
    await expect(insertar('cAbLe uSb')).rejects.toThrow(/UNIQUE constraint failed/);
    await insertar('Fuente');
    await expect(env.DB.prepare("UPDATE taller_catalogo_accesorios SET nombre = 'CABLE USB' WHERE nombre = 'Fuente'").run())
      .rejects.toThrow(/UNIQUE constraint failed/);
  });
  it('genera ID y fecha sin FK ni triggers que vinculen catálogo e historial', async () => {
    await insertar('Adaptador');
    expect(await env.DB.prepare('SELECT * FROM taller_catalogo_accesorios').first())
      .toEqual({ id: expect.any(Number), nombre: 'Adaptador', created_at: expect.any(String) });
    expect((await env.DB.prepare('PRAGMA foreign_key_list(taller_catalogo_accesorios)').all()).results).toEqual([]);
    expect((await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'taller_catalogo_accesorios'")
      .all()).results).toEqual([]);
  });
});
