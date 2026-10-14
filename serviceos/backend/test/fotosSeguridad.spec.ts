import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { crear, migrar } from './serviciosAyudas';
import { cuerpoFotos, fotos, keysFotos, listaFotos, prepararFotos } from './fotosAyudas';
import { guardarFotos, eliminarFoto } from '../src/services/fotosGuardado';

beforeAll(migrar);
beforeEach(prepararFotos);
function request(cantidad = 1, eliminar: number[] = [], lote = crypto.randomUUID()) {
	return new Request('https://example.com', { method: 'POST', headers: { 'Idempotency-Key': lote }, body: cuerpoFotos(cantidad, 'image/jpeg', undefined, eliminar) });
}
function falloR2(metodo: 'put' | 'delete', fallarDesde = 1): Env {
	let llamadas = 0;
	return { ...env, COMPROBANTES: new Proxy(env.COMPROBANTES, { get(target, propiedad) {
		const valor = Reflect.get(target, propiedad);
		if (propiedad === metodo) return (...args: unknown[]) => ++llamadas >= fallarDesde ? Promise.reject(new Error('Fallo R2')) : Reflect.apply(valor, target, args);
		return typeof valor === 'function' ? valor.bind(target) : valor;
	} }) } as Env;
}

it('fallo R2 durante lote limpia archivos nuevos y no aplica eliminaciones existentes', async () => {
	const creado = await crear(); await fotos('POST', creado.id, undefined, cuerpoFotos());
	const [original] = await listaFotos(creado.id), keys = await keysFotos(creado.id);
	await expect(guardarFotos(request(2, [original.id]), falloR2('put', 2), creado.id)).rejects.toThrow('No se pudieron subir');
	expect(await keysFotos(creado.id)).toEqual(keys);
	expect((await env.COMPROBANTES.list()).objects.map(o => o.key)).toEqual(keys);
});

it('fallo D1 transaccional restaura retiros y limpia altas R2 sin referencias rotas', async () => {
	const creado = await crear(); await fotos('POST', creado.id, undefined, cuerpoFotos());
	const originales = await listaFotos(creado.id), keys = await keysFotos(creado.id);
	await env.DB.prepare("CREATE TRIGGER fallo_fotos BEFORE INSERT ON servicio_fotos BEGIN SELECT RAISE(ABORT, 'fallo_fotos'); END").run();
	try {
		await expect(guardarFotos(request(2, originales.map(f => f.id)), env, creado.id)).rejects.toThrow('No se pudieron guardar');
		expect(await listaFotos(creado.id)).toEqual(originales);
		expect((await env.COMPROBANTES.list()).objects.map(o => o.key)).toEqual(keys);
	} finally { await env.DB.prepare('DROP TRIGGER fallo_fotos').run(); }
});

it('D1 commit con respuesta perdida conserva objetos referenciados y retry no duplica', async () => {
	const creado = await crear(), lote = crypto.randomUUID();
	const perdido = { ...env, DB: { prepare: env.DB.prepare.bind(env.DB),
		async batch(escrituras: D1PreparedStatement[]) { await env.DB.batch(escrituras); throw new Error('Respuesta perdida'); },
	} } as unknown as Env;
	const resultado = await guardarFotos(request(2, [], lote), perdido, creado.id);
	expect(resultado.fotos).toHaveLength(2);
	for (const key of await keysFotos(creado.id)) expect(await env.COMPROBANTES.head(key)).not.toBeNull();
	expect((await guardarFotos(request(2, [], lote), env, creado.id)).fotos).toHaveLength(2);
	expect((await env.COMPROBANTES.list()).objects).toHaveLength(2);
});

it('dos subidas concurrentes nunca superan cinco; un trigger protege también inserciones directas', async () => {
	const creado = await crear(); await fotos('POST', creado.id, undefined, cuerpoFotos(4));
	const respuestas = await Promise.all([fotos('POST', creado.id, undefined, cuerpoFotos()), fotos('POST', creado.id, undefined, cuerpoFotos())]);
	expect(respuestas.filter(r => r.status === 200)).toHaveLength(1);
	expect(respuestas.every(r => [200, 400, 409].includes(r.status))).toBe(true);
	expect(await listaFotos(creado.id)).toHaveLength(5);
	expect((await env.COMPROBANTES.list()).objects).toHaveLength(5);
	await expect(env.DB.prepare(`INSERT INTO servicio_fotos (servicio_id,r2_key,mime,size,orden,lote,indice_lote)
		VALUES (?, 'arbitraria', 'image/jpeg', 12, 6, 'directo', 0)`).bind(creado.id).run()).rejects.toThrow('maximo_fotos_servicio');
});

it('fallo R2 al borrar retira referencia y comunica limpieza pendiente; fallo D1 conserva ambos', async () => {
	const creado = await crear(); await fotos('POST', creado.id, undefined, cuerpoFotos(2));
	const filas = await listaFotos(creado.id), keys = await keysFotos(creado.id);
	const falloD1 = { ...env, DB: { prepare() { throw new Error('Fallo D1'); } } } as unknown as Env;
	await expect(eliminarFoto(falloD1, creado.id, filas[0].id)).rejects.toThrow('Fallo D1');
	expect(await keysFotos(creado.id)).toEqual(keys);
	const resultado = await eliminarFoto(falloR2('delete'), creado.id, filas[0].id);
	expect(resultado.aviso).toMatch(/pendiente/);
	expect(await listaFotos(creado.id)).toHaveLength(1);
	expect(await env.COMPROBANTES.head(keys[0])).not.toBeNull();
});

it('backend rechaza campos/key arbitrarios y retiro de foto de otro servicio', async () => {
	const creado = await crear(), otro = await crear({ tecnico_id: 3 });
	await fotos('POST', otro.id, undefined, cuerpoFotos()); const [ajena] = await listaFotos(otro.id);
	expect((await fotos('POST', creado.id, undefined, cuerpoFotos(1, 'image/jpeg', undefined, [ajena.id]))).status).toBe(403);
	const arbitrario = cuerpoFotos(); arbitrario.append('r2_key', 'comprobantes/privado');
	expect((await fotos('POST', creado.id, undefined, arbitrario)).status).toBe(400);
	expect(await listaFotos(creado.id)).toEqual([]);
	expect(await listaFotos(otro.id)).toHaveLength(1);
});
