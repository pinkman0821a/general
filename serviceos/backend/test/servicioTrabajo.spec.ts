import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cookies, crear, detalle, error, lista, migrar, pedir, preparar, remoto } from './serviciosAyudas';
import { productoComision } from '../src/services/servicioTrabajo';

beforeAll(migrar);
beforeEach(preparar);

describe('Servicios RC.3: estado y compatibilidad histórica', () => {
 it.each(['servicio_presencial', 'servicio_remoto', 'garantia', 'instalacion', 'instalacion_remota'])
 ('regresión Cristian: técnico finaliza %s con solo estado y sin trabajo histórico', async tipo => {
  const servicio = await crear({ tipo, confirmar_sobrecarga: true,
   ...(tipo.includes('remot') ? { ciudad: null, direccion: null } : {}),
   valor_servicio: tipo.startsWith('servicio_') ? 250000 : null });
  for (const estado of ['realizado', 'realizado', 'en_proceso', 'realizado']) {
   expect(await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado }, cookies.tecnico)))
    .toMatchObject({ estado, pago_tecnico: servicio.pago_tecnico });
  }
  expect(await env.DB.prepare('SELECT trabajo_realizado FROM servicios WHERE id = ?').bind(servicio.id).first())
   .toEqual({ trabajo_realizado: null });
 });
 it('coordinador también finaliza con solo estado', async () => {
  const servicio = await crear();
  expect((await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }))).estado).toBe('realizado');
 });
 it('preserva datos históricos al editar y finalizar, sin exponerlos ni buscarlos', async () => {
  const servicio = await crear(remoto);
  await env.DB.prepare("UPDATE servicios SET tarjeteria = 'HISTORICO-T', cabezal = 'HISTORICO-C', trabajo_realizado = 'CALIBRACION' WHERE id = ?")
   .bind(servicio.id).run();
  await detalle(await pedir('PATCH', `/${servicio.id}`, { observaciones: 'Histórico' }));
  await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }, cookies.tecnico));
  for (const cookie of [cookies.coordinador, cookies.tecnico]) {
   const respuestas = [await detalle(await pedir('GET', `/${servicio.id}`, undefined, cookie)), ...(await lista('', cookie))];
   for (const respuesta of respuestas) for (const campo of ['tarjeteria', 'cabezal', 'trabajo_realizado']) {
    expect(respuesta).not.toHaveProperty(campo);
   }
  }
  for (const buscar of ['HISTORICO-T', 'HISTORICO-C', 'CALIBRACION']) expect(await lista(`?buscar=${buscar}`)).toEqual([]);
  expect(await env.DB.prepare('SELECT tarjeteria, cabezal, trabajo_realizado FROM servicios WHERE id = ?').bind(servicio.id).first())
   .toEqual({ tarjeteria: 'HISTORICO-T', cabezal: 'HISTORICO-C', trabajo_realizado: 'CALIBRACION' });
 });
 it('no amplía acceso a servicios ajenos ni edición administrativa', async () => {
  const ajeno = await crear({ tecnico_id: 3 });
  await error(await pedir('PATCH', `/${ajeno.id}/estado`, { estado: 'realizado' }, cookies.tecnico), 403);
  await error(await pedir('PATCH', `/${ajeno.id}`, { observaciones: 'Cambio' }, cookies.tecnico), 403);
 });
 it.each(['cliente_nombre', 'cliente_telefono', 'fecha_programada', 'valor_servicio', 'tecnico_id', 'maquina', 'ciudad',
  'direccion', 'comprobante_key', 'observaciones', 'tipo', 'tarjeteria', 'cabezal', 'tipo_falla', 'trabajo_realizado'])
 ('técnico no edita %s mediante estado', async campo => {
  const servicio = await crear();
  await error(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado', [campo]: 'otro' }, cookies.tecnico), 400);
  await error(await pedir('PATCH', `/${servicio.id}`, { [campo]: 'otro' }, cookies.tecnico), 403);
  expect(await detalle(await pedir('GET', `/${servicio.id}`))).toEqual(servicio);
 });
 it.each(['tarjeteria', 'cabezal', 'trabajo_realizado'])('campo retirado %s no se escribe desde API nueva', async campo => {
  await error(await pedir('POST', '', { [campo]: 'nuevo' }), 400);
  const servicio = await crear();
  await error(await pedir('PATCH', `/${servicio.id}`, { [campo]: 'nuevo' }), 400);
 });
 it('Excel mantiene etiquetas históricas y admite servicios nuevos sin trabajo registrado', () => {
  expect(productoComision('servicio_remoto', 'calibración remota')).toBe('CALIBRACION REMOTA');
  expect(productoComision('servicio_presencial', null)).toBe('TRABAJO NO REGISTRADO PRESENCIAL');
  expect(productoComision('instalacion', null)).toBe('INSTALACION PRESENCIAL');
 });
});
