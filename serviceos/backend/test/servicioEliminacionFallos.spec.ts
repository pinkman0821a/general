import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { crear, migrar } from './serviciosAyudas';
import { cuerpoFotos, fotos, keysFotos, prepararFotos } from './fotosAyudas';
import { comprobante, multipart } from './comprobanteAyudas';
import { detalleServicio } from '../src/services/serviciosService';
import { eliminarServicio } from '../src/services/servicioEliminacion';

beforeAll(migrar);
beforeEach(prepararFotos);
async function escenario() {
  const servicio = await crear();
  await fotos('POST', servicio.id, undefined, cuerpoFotos(2));
  await comprobante('PUT', servicio.id, multipart());
  const actual = (await detalleServicio(env, servicio.id))!;
  const keys = [...await keysFotos(servicio.id), actual.comprobante_key!];
  const bytes = await Promise.all(keys.map(async key => new Uint8Array(await (await env.COMPROBANTES.get(key))!.arrayBuffer())));
  return { actual, keys, bytes };
}
async function intacto(escena: Awaited<ReturnType<typeof escenario>>) {
  expect(await detalleServicio(env, escena.actual.id)).not.toBeNull();
  expect(await keysFotos(escena.actual.id)).toEqual(escena.keys.slice(0, 2));
  for (const [indice, key] of escena.keys.entries()) {
    const objeto = await env.COMPROBANTES.get(key);
    expect(objeto).not.toBeNull();
    expect(new Uint8Array(await objeto!.arrayBuffer())).toEqual(escena.bytes[indice]);
    expect(objeto!.httpMetadata?.contentType).toBe('image/jpeg');
  }
  expect((await env.COMPROBANTES.list()).objects).toHaveLength(3);
}

it('Fallo R2 después de borrar un objeto restaura archivos y conserva filas D1', async () => {
  const escena = await escenario(); let llamadas = 0;
  const fallo = { ...env, COMPROBANTES: new Proxy(env.COMPROBANTES, { get(target, propiedad) {
    const valor = Reflect.get(target, propiedad);
    if (propiedad === 'delete') return async (key: string) => {
      await target.delete(key); if (++llamadas === 2) throw new Error('Respuesta R2 perdida');
    };
    return typeof valor === 'function' ? valor.bind(target) : valor;
  } }) } as Env;
  await expect(eliminarServicio(fallo, escena.actual)).rejects.toThrow('restauraron');
  await intacto(escena);
});

it('Fallo D1 tras borrar R2 restaura originales sin referencias rotas', async () => {
  const escena = await escenario();
  await env.DB.prepare("CREATE TRIGGER fallo_eliminar BEFORE DELETE ON servicios BEGIN SELECT RAISE(ABORT, 'fallo_eliminar'); END").run();
  try {
    await expect(eliminarServicio(env, escena.actual)).rejects.toThrow('restauraron');
    await intacto(escena);
  } finally { await env.DB.prepare('DROP TRIGGER fallo_eliminar').run(); }
});

it('DELETE D1 confirmado con respuesta perdida no restaura objetos huérfanos', async () => {
  const escena = await escenario();
  const fallo = { ...env, DB: { prepare(sql: string) {
    const sentencia = env.DB.prepare(sql);
    if (!sql.startsWith('DELETE FROM servicios')) return sentencia;
    return { bind(...valores: unknown[]) { return { async first() {
      await sentencia.bind(...valores).first(); throw new Error('Respuesta D1 perdida');
    } }; } };
  } } } as unknown as Env;
  await eliminarServicio(fallo, escena.actual);
  expect(await detalleServicio(env, escena.actual.id)).toBeNull();
  expect(await keysFotos(escena.actual.id)).toEqual([]);
  expect((await env.COMPROBANTES.list()).objects).toEqual([]);
});

it('Upload concurrente provoca conflicto y mantiene todos los archivos referenciados', async () => {
  const escena = await escenario(); let agregado = false;
  const concurrente = { ...env, COMPROBANTES: new Proxy(env.COMPROBANTES, { get(target, propiedad) {
    const valor = Reflect.get(target, propiedad);
    if (propiedad === 'delete') return async (key: string) => {
      await target.delete(key);
      if (!agregado) { agregado = true; await fotos('POST', escena.actual.id, undefined, cuerpoFotos()); }
    };
    return typeof valor === 'function' ? valor.bind(target) : valor;
  } }) } as Env;
  await expect(eliminarServicio(concurrente, escena.actual)).rejects.toThrow('cambiaron');
  expect(await keysFotos(escena.actual.id)).toHaveLength(3);
  expect((await env.COMPROBANTES.list()).objects).toHaveLength(4);
  for (const key of [...await keysFotos(escena.actual.id), escena.actual.comprobante_key!]) {
    expect(await env.COMPROBANTES.head(key)).not.toBeNull();
  }
});

it('Fallo de lectura R2 no inicia borrado ni modifica D1', async () => {
  const escena = await escenario();
  const fallo = { ...env, COMPROBANTES: { get() { throw new Error('R2 no disponible'); } } } as unknown as Env;
  await expect(eliminarServicio(fallo, escena.actual)).rejects.toThrow('R2 no disponible');
  await intacto(escena);
});
