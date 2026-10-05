import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  crearTaller, detalleRespuesta, errorTaller, migrarTaller, prepararTaller, solicitarTaller,
} from './tallerAyudas';
import type { Cookies } from './tallerAyudas';
import type { AccesorioCatalogoDb } from '../src/services/tallerCatalogoService';

let cookies: Cookies;
const ruta = '/accesorios-catalogo';
beforeAll(migrarTaller);
beforeEach(async () => {
  cookies = await prepararTaller();
  await env.DB.prepare('DELETE FROM taller_catalogo_accesorios').run();
});

async function crear(nombre = 'Cable de poder') {
  const respuesta = await solicitarTaller(cookies.coordinador, 'POST', ruta, { nombre });
  expect(respuesta.status).toBe(201);
  return (await respuesta.json() as { accesorio: AccesorioCatalogoDb }).accesorio;
}

async function listar() {
  const respuesta = await solicitarTaller(cookies.coordinador, 'GET', ruta);
  expect(respuesta.status).toBe(200);
  return (await respuesta.json() as { accesorios: AccesorioCatalogoDb[] }).accesorios;
}

describe('Catálogo de Taller: permisos y operaciones', () => {
  it('la migración deja el catálogo vacío sin presets', async () => {
    expect(await listar()).toEqual([]);
    expect(await env.DB.prepare('SELECT COUNT(*) AS total FROM taller_catalogo_accesorios').first())
      .toEqual({ total: 0 });
  });
  it('coordinador crea con trim y lista alfabéticamente', async () => {
    const fuente = await crear(' \tFuente\n');
    const cable = await crear('Cable USB');
    const adaptador = await crear('adaptador');
    expect(fuente).toEqual({ id: expect.any(Number), nombre: 'Fuente', created_at: expect.any(String) });
    expect(await listar()).toEqual([adaptador, cable, fuente]);
  });
  it('coordinador elimina solamente la opción indicada', async () => {
    const cable = await crear();
    const fuente = await crear('Fuente');
    const respuesta = await solicitarTaller(cookies.coordinador, 'DELETE', `${ruta}/${cable.id}`);
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ status: 'ok' });
    expect(await listar()).toEqual([fuente]);
  });
  it.each(['GET', 'POST', 'DELETE'])('el técnico no puede %s el catálogo', async (metodo) => {
    const accesorio = await crear();
    await errorTaller(await solicitarTaller(cookies.tecnico, metodo,
      metodo === 'DELETE' ? `${ruta}/${accesorio.id}` : ruta, metodo === 'POST' ? { nombre: 'Fuente' } : undefined), 403);
    expect(await listar()).toEqual([accesorio]);
  });
  it.each(['GET', 'POST', 'DELETE'])('%s requiere sesión válida y usuario activo', async (metodo) => {
    const sufijo = metodo === 'DELETE' ? `${ruta}/1` : ruta;
    for (const cookie of ['', 'serviceos_session=inexistente']) {
      await errorTaller(await solicitarTaller(cookie, metodo, sufijo), 401);
    }
    await env.DB.prepare("UPDATE sesiones SET expires_at = '2000-01-01T00:00:00Z'").run();
    await errorTaller(await solicitarTaller(cookies.coordinador, metodo, sufijo), 401);
    cookies = await prepararTaller();
    await env.DB.prepare('UPDATE usuarios SET activo = 0').run();
    await errorTaller(await solicitarTaller(cookies.coordinador, metodo, sufijo), 401);
  });
  it('rechaza duplicados case-insensitive tras trim sin modificar la opción', async () => {
    const accesorio = await crear('Cable USB');
    await errorTaller(await solicitarTaller(cookies.coordinador, 'POST', ruta, { nombre: '  cAbLe uSb  ' }), 409);
    expect(await listar()).toEqual([accesorio]);
  });
  it.each(['', ' ', '\t\n', '\u00a0', '\ufeff', null, 10, true, [], {}])(
    'rechaza nombre inválido %j', async (nombre) => {
      await errorTaller(await solicitarTaller(cookies.coordinador, 'POST', ruta, { nombre }), 400);
      expect(await listar()).toEqual([]);
    },
  );
  it.each([{}, [], null, { nombre: 'Cable', id: 2 }])('rechaza cuerpo inválido %j', async (body) => {
    await errorTaller(await solicitarTaller(cookies.coordinador, 'POST', ruta, body), 400);
  });
  it.each(['0', '-1', '1.5', 'abc', '1x', '9007199254740992'])('rechaza ID inválido %s', async (id) => {
    await errorTaller(await solicitarTaller(cookies.coordinador, 'DELETE', `${ruta}/${id}`), 400);
  });
  it('responde 404 para inexistente y para una segunda eliminación', async () => {
    await errorTaller(await solicitarTaller(cookies.coordinador, 'DELETE', `${ruta}/99999`), 404);
    const accesorio = await crear();
    expect((await solicitarTaller(cookies.coordinador, 'DELETE', `${ruta}/${accesorio.id}`)).status).toBe(200);
    await errorTaller(await solicitarTaller(cookies.coordinador, 'DELETE', `${ruta}/${accesorio.id}`), 404);
  });
});

describe('Catálogo de Taller: historial independiente', () => {
  it('borrar catálogo conserva íntegramente accesorios e ingreso/entrega históricos', async () => {
    const frecuente = await crear('Cable USB');
    const recibida = await crearTaller(cookies.coordinador, {
      accesorios: [frecuente.nombre, 'Control personalizado'], maquina_serial: 'Serial anterior',
    });
    const entregada = await detalleRespuesta(await solicitarTaller(cookies.tecnico, 'PUT', `/${recibida.id}/entrega`, {
      fecha_entrega: '2026-10-10', accesorios_devueltos: [recibida.accesorios[0].id],
    }));
    expect((await solicitarTaller(cookies.coordinador, 'DELETE', `${ruta}/${frecuente.id}`)).status).toBe(200);
    expect(await listar()).toEqual([]);
    for (const cookie of Object.values(cookies)) {
      expect(await detalleRespuesta(await solicitarTaller(cookie, 'GET', `/${recibida.id}`))).toEqual(entregada);
    }
    expect((await env.DB.prepare('SELECT * FROM taller_accesorios WHERE recepcion_id = ?')
      .bind(recibida.id).all()).results).toEqual(entregada.accesorios);
  });
  it('el accesorio borrado puede conservarse o quitarse solo de su recepción', async () => {
    const frecuente = await crear();
    const primera = await crearTaller(cookies.coordinador, { accesorios: [frecuente.nombre], maquina_serial: 'Original' });
    const otra = await crearTaller(cookies.coordinador, { accesorios: [frecuente.nombre] });
    expect((await solicitarTaller(cookies.coordinador, 'DELETE', `${ruta}/${frecuente.id}`)).status).toBe(200);
    const conservada = await detalleRespuesta(await solicitarTaller(cookies.coordinador, 'PATCH', `/${primera.id}`, {
      cliente_nombre: 'Editado', accesorios: [frecuente.nombre],
    }));
    expect(conservada.accesorios).toEqual(primera.accesorios);
    expect(conservada.maquina_serial).toBe('Original');
    const quitada = await detalleRespuesta(await solicitarTaller(cookies.coordinador, 'PATCH', `/${primera.id}`, { accesorios: [] }));
    expect(quitada.accesorios).toEqual([]);
    expect(await detalleRespuesta(await solicitarTaller(cookies.tecnico, 'GET', `/${otra.id}`))).toEqual(otra);
  });
  it('el accesorio personalizado no modifica el catálogo ni requiere pertenecer a él', async () => {
    const recibida = await crearTaller(cookies.coordinador, { accesorios: ['Adaptador personalizado'] });
    expect(recibida.accesorios[0].nombre).toBe('Adaptador personalizado');
    expect(await listar()).toEqual([]);
  });
});
