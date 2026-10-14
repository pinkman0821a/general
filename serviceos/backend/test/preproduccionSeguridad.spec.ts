import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { cookies, crear, migrar, pedir, preparar } from './serviciosAyudas';
import { crearSesion } from '../src/services/sessionService';
import { comprobante, multipart } from './comprobanteAyudas';
import { cuerpoFotos, fotos, listaFotos } from './fotosAyudas';

beforeAll(migrar);
beforeEach(preparar);
function api(ruta: string, cookie = '', method = 'GET', body?: unknown) {
  return SELF.fetch(`https://example.com/api${ruta}`, { method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
}

it('Matriz global: coordinador consulta; ambos técnicos 403; sin sesión 401', async () => {
  const ajeno = `serviceos_session=${await crearSesion(env, 3)}`;
  const rutas = ['/agenda?mes=2026-10', '/inicio/resumen', '/finanzas/resumen?mes=2026-10',
    '/finanzas/tecnicos/2?mes=2026-10', '/servicios/resumen-pagos?mes=2026-10',
    '/tecnicos', '/usuarios', '/skills', '/tecnicos/2/skills',
    '/tecnicos/2/disponibilidad?desde=2026-10-01&hasta=2026-10-31'];
  for (const ruta of rutas) {
    for (const [cookie, status] of [[cookies.coordinador, 200], [cookies.tecnico, 403], [ajeno, 403], ['', 401]] as const) {
      const respuesta = await api(ruta, cookie);
      expect(respuesta.status, `${ruta}: ${cookie ? status : 'sin sesión'}`).toBe(status);
      expect(JSON.stringify(await respuesta.json())).not.toMatch(/password_hash|token_hash|comprobante_key|r2_key/);
    }
  }
});

it('Matriz servicios: propio, ajeno, estados, trabajo, comprobante, fotos y Excel', async () => {
  const servicio = await crear({ trabajo_realizado: 'CALIBRACION' });
  await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' });
  await comprobante('PUT', servicio.id, multipart());
  await fotos('POST', servicio.id, undefined, cuerpoFotos());
  const [foto] = await listaFotos(servicio.id);
  const ajeno = `serviceos_session=${await crearSesion(env, 3)}`;
  for (const sufijo of ['', '/fotos', `/fotos/${foto.id}`, '/comprobante']) {
    for (const [cookie, status] of [[cookies.coordinador, 200], [cookies.tecnico, sufijo === '/comprobante' ? 403 : 200],
      [ajeno, 403], ['', 401]] as const) {
      const respuesta = await api(`/servicios/${servicio.id}${sufijo}`, cookie);
      expect(respuesta.status).toBe(status);
      if (respuesta.headers.get('Content-Type')?.includes('json')) {
        const texto = await respuesta.text();
        expect(texto).not.toMatch(/r2_key|comprobante_key|password_hash|token_hash/);
        if (cookie === cookies.tecnico && respuesta.status === 200) expect(texto).not.toMatch(/comprobante/);
      }
    }
  }
  for (const cookie of [cookies.tecnico, ajeno]) {
    expect((await api('/servicios', cookie, 'POST', {})).status).toBe(403);
    expect((await api(`/servicios/${servicio.id}`, cookie, 'PATCH', { cliente_nombre: 'Cambio' })).status).toBe(403);
    expect((await api(`/servicios/${servicio.id}/fotos`, cookie, 'POST')).status).toBe(403);
    expect((await api(`/servicios/${servicio.id}/fotos/${foto.id}`, cookie, 'DELETE')).status).toBe(403);
  }
  expect((await api(`/servicios/${servicio.id}/estado`, ajeno, 'PATCH', { estado: 'pendiente' })).status).toBe(403);
  expect((await api(`/servicios/${servicio.id}/estado`, cookies.tecnico, 'PATCH', { estado: 'realizado', trabajo_realizado: 'REVISION' })).status).toBe(200);
  expect((await api('/servicios/comisiones.xlsx?mes=2026-10', cookies.tecnico)).status).toBe(200);
  expect((await api('/servicios/comisiones.xlsx?mes=2026-10&tecnico_id=3', cookies.tecnico)).status).toBe(403);
  expect((await api('/servicios/comisiones.xlsx?mes=2026-10')).status).toBe(401);
});

it('Oficina: lectura y entrega son compartidas; creación/edición y catálogo son administrativos', async () => {
  expect((await api('/taller', cookies.tecnico)).status).toBe(200);
  expect((await api('/taller')).status).toBe(401);
  expect((await api('/taller', cookies.tecnico, 'POST', {})).status).toBe(403);
  expect((await api('/taller/1', cookies.tecnico, 'PATCH', {})).status).toBe(403);
  expect((await api('/taller/accesorios-catalogo', cookies.tecnico)).status).toBe(403);
  expect((await api('/taller/accesorios-catalogo', cookies.tecnico, 'POST', {})).status).toBe(403);
  expect((await api('/taller/1', cookies.coordinador, 'DELETE')).status).toBe(404);
});

it('Sesión inválida, expirada y usuario desactivado no permiten acceso', async () => {
  expect((await api('/auth/me', 'serviceos_session=invalida')).status).toBe(401);
  await env.DB.prepare("UPDATE sesiones SET expires_at = '2000-01-01T00:00:00.000Z'").run();
  expect((await api('/auth/me', cookies.tecnico)).status).toBe(401);
  const cookie = `serviceos_session=${await crearSesion(env, 2)}`;
  await env.DB.prepare('UPDATE usuarios SET activo = 0 WHERE id = 2').run();
  expect((await api('/auth/me', cookie)).status).toBe(401);
  expect((await api('/servicios', cookie)).status).toBe(401);
});

it('Escrituras administrativas no admiten técnicos ni peticiones sin sesión', async () => {
  const ajeno = `serviceos_session=${await crearSesion(env, 3)}`;
  const rutas = [['/usuarios', 'POST'], ['/usuarios/estado', 'PATCH'], ['/usuarios/password', 'PATCH'],
    ['/usuarios/datos', 'PATCH'], ['/coordinador', 'PATCH'], ['/coordinador/password', 'PATCH'],
    ['/skills', 'POST'], ['/tecnicos/2/skills', 'POST'], ['/tecnicos/2/skills/1', 'DELETE'],
    ['/tecnicos/2/disponibilidad', 'POST'], ['/tecnicos/2/disponibilidad/2026-10-05', 'DELETE']];
  for (const [ruta, metodo] of rutas) {
    for (const [cookie, status] of [[cookies.tecnico, 403], [ajeno, 403], ['', 401]] as const) {
      expect((await api(ruta, cookie, metodo, {})).status, ruta).toBe(status);
    }
  }
});

it('Migraciones 0001–0015 aplicadas en D1 aislada: integridad, FK, índices y triggers', async () => {
  const migraciones = (await env.DB.prepare('SELECT name FROM d1_migrations ORDER BY id').all<{ name: string }>()).results;
  expect(migraciones).toHaveLength(15);
  expect(migraciones[0].name).toBe('0001_create_app_info.sql');
  expect(migraciones[13].name).toBe('0014_create_servicio_fotos.sql');
  expect(migraciones[14].name).toBe('0015_update_app_info_version.sql');
  expect((await env.DB.prepare('PRAGMA foreign_key_check').all()).results).toEqual([]);
  const objetos = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type IN ('index', 'trigger')").all<{ name: string }>()).results.map(o => o.name);
  expect(objetos).toEqual(expect.arrayContaining(['idx_servicios_tecnico_fecha', 'idx_servicio_fotos_orden',
    'servicio_fotos_maximo', 'servicio_fotos_maximo_actualizar']));
});
