import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { cookies, crear, lista, migrar, pedir } from './serviciosAyudas';
import { crearSesion } from '../src/services/sessionService';
import { cuerpoFotos, fotos, keysFotos, prepararFotos } from './fotosAyudas';
import { comprobante, multipart, referencia } from './comprobanteAyudas';
import { consultarAgenda, consultarInicio } from '../src/services/agendaConsulta';
import { consultarFinanzas, consultarResumenPersonal } from '../src/services/finanzasConsulta';

beforeAll(migrar);
beforeEach(prepararFotos);

it.each([[0, false], [1, false], [5, false], [0, true], [5, true]])(
  'Coordinador elimina servicio con %s fotos y comprobante=%s sin objetos ni filas huérfanas', async (cantidad, pago) => {
    const servicio = await crear();
    if (cantidad) expect((await fotos('POST', servicio.id, undefined, cuerpoFotos(cantidad))).status).toBe(200);
    if (pago) expect((await comprobante('PUT', servicio.id, multipart())).status).toBe(200);
    const respuesta = await pedir('DELETE', `/${servicio.id}`);
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ status: 'ok', message: 'Servicio eliminado correctamente.' });
    expect(await lista()).toEqual([]);
    expect(await keysFotos(servicio.id)).toEqual([]);
    expect(await referencia(servicio.id)).toBeNull();
    expect((await env.COMPROBANTES.list()).objects).toEqual([]);
    expect((await env.DB.prepare('PRAGMA foreign_key_check').all()).results).toEqual([]);
    expect((await pedir('DELETE', `/${servicio.id}`)).status).toBe(404);
  });

it('Técnico asignado/ajeno 403 y sin sesión 401; no toca datos ni R2', async () => {
  const servicio = await crear();
  await fotos('POST', servicio.id, undefined, cuerpoFotos());
  const ajeno = `serviceos_session=${await crearSesion(env, 3)}`;
  for (const [cookie, status] of [[cookies.tecnico, 403], [ajeno, 403], ['', 401]] as const) {
    expect((await pedir('DELETE', `/${servicio.id}`, undefined, cookie)).status).toBe(status);
  }
  expect(await lista()).toHaveLength(1);
  expect((await env.COMPROBANTES.list()).objects).toHaveLength(1);
});

it.each(['0', '-1', 'abc', '1.5', '9007199254740992'])('ID inválido %s devuelve 400', async id => {
  expect((await pedir('DELETE', `/${id}`)).status).toBe(400);
});
it('Servicio inexistente devuelve 404', async () => {
  expect((await pedir('DELETE', '/999')).status).toBe(404);
});

it('Desaparece de Agenda/Inicio/Finanzas/resumen propio/Excel y conserva la edición de otro servicio', async () => {
  const servicio = await crear({ trabajo_realizado: 'REVISION' });
  await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' });
  expect((await consultarFinanzas(env, '2026-10')).resumen.pago_tecnicos).toBe(100000);
  expect((await pedir('GET', '/comisiones.xlsx?mes=2026-10')).status).toBe(200);
  expect((await pedir('DELETE', `/${servicio.id}`)).status).toBe(200);
  const dia = (await consultarAgenda(env, '2026-10')).dias.find(d => d.fecha === '2026-10-15')!;
  expect(dia.tecnicos.every(t => !t.presenciales.length && !t.remotos.length)).toBe(true);
  expect((await consultarInicio(env, '2026-10-15')).resumen.servicios_hoy).toBe(0);
  expect((await consultarFinanzas(env, '2026-10')).resumen.pago_tecnicos).toBe(0);
  expect((await consultarResumenPersonal(env, 2, '2026-10')).pago_generado).toBe(0);
  const excel = await pedir('GET', '/comisiones.xlsx?mes=2026-10');
  expect(excel.status).toBe(400);
  expect(await excel.json()).toMatchObject({ codigo: 'sin_servicios_realizados' });
  const otro = await crear();
  expect((await pedir('PATCH', `/${otro.id}`, { observaciones: 'Edición preservada' })).status).toBe(200);
});

it('Elimina comprobante histórico oculto por cambio a instalación y conserva archivos de otro servicio', async () => {
  const servicio = await crear(), otro = await crear({ tecnico_id: 3 });
  await comprobante('PUT', servicio.id, multipart());
  await fotos('POST', otro.id, undefined, cuerpoFotos());
  const keys = await keysFotos(otro.id);
  expect((await pedir('PATCH', `/${servicio.id}`, { tipo: 'instalacion', valor_servicio: null })).status).toBe(200);
  expect((await pedir('DELETE', `/${servicio.id}`)).status).toBe(200);
  expect((await env.COMPROBANTES.list()).objects.map(o => o.key)).toEqual(keys);
  expect(await lista()).toHaveLength(1);
});
