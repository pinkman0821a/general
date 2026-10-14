import { env } from 'cloudflare:workers';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { crear, migrar } from './serviciosAyudas';
import { comprobante, multipart, prepararComprobante, referencia } from './comprobanteAyudas';
import { eliminarComprobante, servicioConComprobante, subirComprobante } from '../src/services/comprobanteService';

beforeAll(migrar);
beforeEach(prepararComprobante);

function request() { return new Request('https://example.com', { method: 'PUT', body: multipart() }); }

it('Fallo D1 después del upload limpia nuevo objeto y conserva el anterior', async () => {
	const creado = await crear(); await comprobante('PUT', creado.id, multipart());
	const actual = await servicioConComprobante(env, creado.id);
	const fallo = { COMPROBANTES: env.COMPROBANTES, DB: {
		prepare() { throw new Error('Fallo D1 simulado'); },
	} } as unknown as Env;
	await expect(subirComprobante(request(), fallo, actual)).rejects.toThrow('Fallo D1');
	expect((await referencia(creado.id))!.comprobante_key).toBe(actual.comprobante_key);
	expect((await env.COMPROBANTES.list()).objects.map(objeto => objeto.key)).toEqual([actual.comprobante_key]);
});

it('Reemplazo concurrente no pisa la referencia más nueva y limpia objeto descartado', async () => {
	const creado = await crear(); await comprobante('PUT', creado.id, multipart());
	const antigua = await servicioConComprobante(env, creado.id);
	await comprobante('PUT', creado.id, multipart());
	const nueva = (await referencia(creado.id))!.comprobante_key;
	await expect(subirComprobante(request(), env, antigua)).rejects.toThrow('cambió durante');
	expect((await referencia(creado.id))!.comprobante_key).toBe(nueva);
	expect((await env.COMPROBANTES.list()).objects.map(objeto => objeto.key)).toEqual([nueva]);
	await expect(eliminarComprobante(env, antigua)).rejects.toThrow('cambió');
	expect((await referencia(creado.id))!.comprobante_key).toBe(nueva);
});

it('Cambio concurrente de tipo conserva evidencia previa y limpia upload descartado', async () => {
	const creado = await crear(); await comprobante('PUT', creado.id, multipart());
	const antigua = await servicioConComprobante(env, creado.id);
	await env.DB.prepare("UPDATE servicios SET tipo = 'instalacion', tipo_falla = NULL, valor_servicio = NULL WHERE id = ?").bind(creado.id).run();
	await expect(subirComprobante(request(), env, antigua)).rejects.toThrow('cambió durante');
	expect((await referencia(creado.id))!.comprobante_key).toBe(antigua.comprobante_key);
	expect((await env.COMPROBANTES.list()).objects.length).toBe(1);
});

function conFalloDeLimpieza(): Env {
	// Solo inyecta el fallo de DELETE; los objetos y D1 siguen siendo los bindings simulados reales.
	return { DB: env.DB, COMPROBANTES: new Proxy(env.COMPROBANTES, {
		get(target, propiedad) {
			if (propiedad === 'delete') return () => Promise.reject(new Error('Fallo de limpieza R2'));
			const valor = Reflect.get(target, propiedad);
			return typeof valor === 'function' ? valor.bind(target) : valor;
		},
	}) } as Env;
}

it('Commit D1 con respuesta perdida conserva el nuevo comprobante y limpia el anterior', async () => {
	const creado = await crear(); await comprobante('PUT', creado.id, multipart());
	const actual = await servicioConComprobante(env, creado.id);
	const perdido = { ...env, DB: { prepare(sql: string) {
		const sentencia = env.DB.prepare(sql);
		if (!sql.startsWith('UPDATE servicios SET comprobante_key')) return sentencia;
		return { bind(...valores: unknown[]) {
			return { async first() { await sentencia.bind(...valores).first(); throw new Error('Respuesta perdida'); } };
		} };
	} } } as unknown as Env;
	const respuesta = await subirComprobante(request(), perdido, actual);
	expect(respuesta.status).toBe('ok');
	const nueva = (await referencia(creado.id))!.comprobante_key!;
	expect(nueva).not.toBe(actual.comprobante_key);
	expect(await env.COMPROBANTES.head(nueva)).not.toBeNull();
	expect(await env.COMPROBANTES.head(actual.comprobante_key!)).toBeNull();
});

it('Respuesta perdida y lectura D1 fallida conservan archivo ante resultado desconocido', async () => {
	const creado = await crear(), actual = await servicioConComprobante(env, creado.id);
	const perdido = { ...env, DB: { prepare(sql: string) {
		if (sql.startsWith('SELECT')) throw new Error('Lectura no disponible');
		const sentencia = env.DB.prepare(sql);
		return { bind(...valores: unknown[]) {
			return { async first() { await sentencia.bind(...valores).first(); throw new Error('Respuesta perdida'); } };
		} };
	} } } as unknown as Env;
	await expect(subirComprobante(request(), perdido, actual)).rejects.toThrow('se conservó el archivo');
	const key = (await referencia(creado.id))!.comprobante_key!;
	expect(await env.COMPROBANTES.head(key)).not.toBeNull();
});

it('Si R2 falla al eliminar, limpia D1 y responde aviso claro sin referencia rota', async () => {
	const creado = await crear(); await comprobante('PUT', creado.id, multipart());
	const actual = await servicioConComprobante(env, creado.id);
	const resultado = await eliminarComprobante(conFalloDeLimpieza(), actual);
	expect(resultado).toHaveProperty('aviso', expect.stringContaining('pendiente'));
	expect((await referencia(creado.id))!.comprobante_key).toBeNull();
	expect(await env.COMPROBANTES.head(actual.comprobante_key!)).not.toBeNull();
});

it('Si falla limpieza anterior, el reemplazo sigue apuntando al nuevo y expone aviso', async () => {
	const creado = await crear(); await comprobante('PUT', creado.id, multipart());
	const actual = await servicioConComprobante(env, creado.id);
	const resultado = await subirComprobante(request(), conFalloDeLimpieza(), actual);
	expect(resultado).toHaveProperty('aviso', expect.stringContaining('pendiente'));
	const nuevo = (await referencia(creado.id))!.comprobante_key;
	expect(nuevo).not.toBe(actual.comprobante_key);
	expect(await env.COMPROBANTES.head(nuevo!)).not.toBeNull();
});
