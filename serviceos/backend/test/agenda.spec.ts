import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { cookies, crear, detalle, error, migrar, pedir, preparar, remoto } from './serviciosAyudas';
import { consultarAgenda, consultarInicio, fechaColombia, fechasMesAgenda } from '../src/services/agendaConsulta';

beforeAll(migrar);
beforeEach(preparar);
function consultar(ruta: string, cookie = cookies.coordinador) {
	return SELF.fetch(`https://example.com${ruta}`, { headers: { Cookie: cookie } });
}
async function bloqueo(fecha: string, motivo: string | null = 'Viaje', tecnico = 2) {
	await env.DB.prepare('INSERT INTO tecnico_indisponibilidades (tecnico_id, fecha, motivo) VALUES (?, ?, ?)').bind(tecnico, fecha, motivo).run();
}
async function servicio(cambios: Record<string, unknown> = {}) {
	return crear({ confirmar_sobrecarga: true, ...cambios });
}
async function dia(fecha = '2026-10-15') {
	return (await consultarAgenda(env, fecha.slice(0, 7))).dias.find(d => d.fecha === fecha)!;
}

it.each(['/api/agenda?mes=2026-10', '/api/inicio/resumen', '/api/agenda?mes=incorrecto'])('solo coordinador %s', async ruta => {
	await error(await consultar(ruta, ''), 401);
	await error(await consultar(ruta, cookies.tecnico), 403);
});

it.each(['', '?mes=', '?mes=2026-1', '?mes=2026-00', '?mes=2026-13', '?mes=0000-01', '?mes=2026-10-01',
	'?mes=2026-10&mes=2026-11', '?mes=2026-10%20'])('mes estricto %s', async consulta => {
	await error(await consultar(`/api/agenda${consulta}`), 400);
});

it('sin servicios devuelve técnicos activos disponibles, mes completo y KPIs cero reales', async () => {
	const respuesta = await consultar('/api/agenda?mes=2026-10');
	expect(respuesta.status).toBe(200);
	expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
	const agenda = await respuesta.json() as Awaited<ReturnType<typeof consultarAgenda>>;
	expect(agenda.dias).toHaveLength(31);
	expect(agenda.dias[0].fecha).toBe('2026-10-01');
	expect(agenda.dias[30].fecha).toBe('2026-10-31');
	expect(agenda.dias.every(d => d.tecnicos.length === 2 && d.tecnicos.every(t => t.estado === 'disponible'))).toBe(true);
	const inicio = await consultarInicio(env, '2026-10-15');
	expect(inicio.resumen).toEqual({ servicios_hoy: 0, en_proceso: 0, realizados: 0, tecnicos_libres: 2 });
	expect(inicio.servicios).toEqual([]);
});

it.each(['garantia', 'servicio_presencial', 'instalacion', 'servicio_remoto', 'instalacion_remota'])('ocupación por tipo %s', async tipo => {
	const esRemoto = tipo === 'servicio_remoto' || tipo === 'instalacion_remota';
	const creado = await servicio({ tipo, ...(esRemoto ? { ciudad: null, direccion: null } : {}),
		...(['garantia', 'instalacion', 'instalacion_remota'].includes(tipo) ? { valor_servicio: null } : {}) });
	const tecnico = (await dia()).tecnicos.find(t => t.id === 2)!;
	expect(tecnico.estado).toBe(esRemoto ? 'disponible' : 'programado');
	expect((esRemoto ? tecnico.remotos : tecnico.presenciales).map(s => s.id)).toEqual([creado.id]);
	expect((await consultarInicio(env, '2026-10-15')).resumen.tecnicos_libres).toBe(esRemoto ? 2 : 1);
});

it('sobrecarga es advertencia y manual es prioritario incluso con 2 presenciales y remotos', async () => {
	await servicio(); await servicio({ cliente_nombre: 'Segundo' }); await servicio(remoto);
	let tecnico = (await dia()).tecnicos.find(t => t.id === 2)!;
	expect(tecnico.estado).toBe('sobrecarga');
	expect(tecnico.presenciales).toHaveLength(2); expect(tecnico.remotos).toHaveLength(1);
	await bloqueo('2026-10-15');
	tecnico = (await dia()).tecnicos.find(t => t.id === 2)!;
	expect(tecnico.estado).toBe('no_disponible'); expect(tecnico.motivo).toBe('Viaje');
	expect(tecnico.presenciales).toHaveLength(2);
	expect((await consultarInicio(env, '2026-10-15')).tecnicos).toEqual((await dia()).tecnicos);
});

it.each([null, 'Viaje'])('bloqueo manual sin servicios y motivo %s quita condición libre', async motivo => {
	await bloqueo('2026-10-15', motivo);
	const tecnico = (await dia()).tecnicos.find(t => t.id === 2)!;
	expect(tecnico).toMatchObject({ estado: 'no_disponible', motivo });
	expect((await consultarInicio(env, '2026-10-15')).resumen.tecnicos_libres).toBe(1);
});

it('inactivo asignado no desaparece; sin actividad diaria no aparece como disponible', async () => {
	await env.DB.prepare('UPDATE usuarios SET activo = 1 WHERE id = 4').run();
	const asignado = await servicio({ tecnico_id: 4 });
	await env.DB.prepare('UPDATE usuarios SET activo = 0 WHERE id = 4').run();
	expect((await dia()).tecnicos.find(t => t.id === 4)).toMatchObject({ activo: 0, estado: 'programado', presenciales: [{ id: asignado.id }] });
	expect((await dia('2026-10-16')).tecnicos.some(t => t.id === 4)).toBe(false);
	const inicio = await consultarInicio(env, '2026-10-15');
	expect(inicio.resumen.servicios_hoy).toBe(1); expect(inicio.resumen.tecnicos_libres).toBe(2);
	expect(inicio.tecnicos.some(t => t.id === 4)).toBe(false);
	expect(inicio.servicios[0].id).toBe(asignado.id);
});

it('mes y días aislados, servicios fecha ASC/id ASC, sin proyección administrativa', async () => {
	const tarde = await servicio({ fecha_programada: '2026-10-30' });
	const primero = await servicio({ fecha_programada: '2026-10-01' });
	const segundo = await servicio({ fecha_programada: '2026-10-01' });
	await servicio({ fecha_programada: '2026-09-30' });
	await servicio({ fecha_programada: '2026-11-01' });
	await bloqueo('2026-09-30', 'Otro mes', 3);
	const agenda = await consultarAgenda(env, '2026-10');
	const ids = agenda.dias.flatMap(d => d.tecnicos.flatMap(t => [...t.presenciales, ...t.remotos].map(s => s.id)));
	expect(ids).toEqual([primero.id, segundo.id, tarde.id]);
	expect(agenda.dias.every(d => d.tecnicos.find(t => t.id === 3)?.estado === 'disponible')).toBe(true);
	expect(JSON.stringify(agenda)).not.toMatch(/cliente_telefono|comprobante|valor_servicio|direccion|pago_tecnico/);
	expect((await consultarAgenda(env, '2026-09')).dias.flatMap(d => d.tecnicos.flatMap(t => t.presenciales))).toHaveLength(1);
});

it('Inicio usa hoy Colombia: todos los tipos/estados cuentan, máximo 5 servicios ordenados y agenda consistente', async () => {
	const hoy = fechaColombia();
	const creado = await servicio({ fecha_programada: hoy });
	await detalle(await pedir('PATCH', `/${creado.id}/estado`, { estado: 'en_proceso' }));
	const remotoHoy = await servicio({ ...remoto, tecnico_id: 3, fecha_programada: hoy });
	await detalle(await pedir('PATCH', `/${remotoHoy.id}/estado`, { estado: 'realizado' }));
	for (let indice = 0; indice < 4; indice++) await servicio({ ...remoto, fecha_programada: hoy });
	await servicio({ fecha_programada: hoy === '2026-10-15' ? '2026-10-16' : '2026-10-15' });
	const respuesta = await consultar('/api/inicio/resumen');
	expect(respuesta.status).toBe(200); expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
	const inicio = await respuesta.json() as Awaited<ReturnType<typeof consultarInicio>>;
	expect(inicio.hoy).toBe(hoy);
	expect(inicio.resumen).toEqual({ servicios_hoy: 6, en_proceso: 1, realizados: 1, tecnicos_libres: 1 });
	expect(inicio.servicios).toHaveLength(5);
	expect(inicio.servicios.map(s => s.id)).toEqual([...inicio.servicios.map(s => s.id)].sort((a, b) => a - b));
	expect(inicio.tecnicos).toEqual((await dia(hoy)).tecnicos);
});

it('fecha Bogotá evita cambio de día UTC y febrero incluye solo días reales', () => {
	expect(fechaColombia(new Date('2026-10-06T02:00:00Z'))).toBe('2026-10-05');
	expect(fechaColombia(new Date('2026-10-06T05:00:00Z'))).toBe('2026-10-06');
	expect(fechasMesAgenda('2024-02')).toHaveLength(29);
	expect(fechasMesAgenda('2026-02')).toHaveLength(28);
});
