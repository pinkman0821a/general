import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { cookies, migrar, preparar } from './serviciosAyudas';
import { crearPasswordHash, verificarPassword } from '../src/services/passwordService';

beforeAll(migrar);
beforeEach(preparar);
const password = 'Clave de prueba únicamente';
async function entrar(user: unknown, clave: unknown = password) {
  return SELF.fetch('https://example.com/api/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, password: clave }) });
}
async function guardado(id: number) {
  return (await env.DB.prepare('SELECT password_hash FROM usuarios WHERE id = ?').bind(id)
    .first<{ password_hash: string }>())!.password_hash;
}

it('Hash con salt aleatorio, verifica clave, rechaza clave incorrecta y formato corrupto', async () => {
  const hash = await crearPasswordHash(password);
  expect(hash).not.toContain(password);
  expect(hash).toMatch(/^pbkdf2-sha256\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
  expect(await crearPasswordHash(password)).not.toBe(hash);
  expect(await verificarPassword(password, hash)).toBe(true);
  expect(await verificarPassword('incorrecta', hash)).toBe(false);
  expect(await verificarPassword(password, 'pbkdf2-sha256$corrupto')).toBe(false);
});

it.each([[1, 'coordinador', 'coordinador'], [2, 'juan', 'tecnico']])(
  'Login legacy %s conserva identidad y actualiza hash sin exponerlo; logout invalida sesión', async (id, user, rol) => {
    await env.DB.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').bind(password, id).run();
    const login = await entrar(user);
    expect(login.status).toBe(200);
    expect(await login.json()).toEqual({ status: 'ok', usuario: { id, nombre: id === 1 ? 'Coordinador' : 'Juan', user, rol } });
    expect(await verificarPassword(password, await guardado(id))).toBe(true);
    expect(await guardado(id)).not.toBe(password);
    const cookie = login.headers.get('Set-Cookie')!.split(';')[0];
    expect(login.headers.get('Set-Cookie')).toContain('HttpOnly');
    expect(login.headers.get('Set-Cookie')).toContain('Secure');
    expect((await SELF.fetch('https://example.com/api/auth/me', { headers: { Cookie: cookie } })).status).toBe(200);
    const siguiente = await entrar(user);
    expect(siguiente.status).toBe(200); // También entra con hash ya migrado.
    const salir = await SELF.fetch('https://example.com/api/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
    expect(salir.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect((await SELF.fetch('https://example.com/api/auth/me', { headers: { Cookie: cookie } })).status).toBe(401);
  });

it('Usuario inactivo no entra ni actualiza su clave legacy', async () => {
  await env.DB.prepare('UPDATE usuarios SET password_hash = ? WHERE id = 4').bind(password).run();
  expect((await entrar('inactivo')).status).toBe(403);
  expect(await guardado(4)).toBe(password);
});

it('Crear técnico y restablecer su clave guarda hashes y revoca sus sesiones', async () => {
  const nuevo = await SELF.fetch('https://example.com/api/usuarios', { method: 'POST',
    headers: { Cookie: cookies.coordinador, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Prueba aislada', user: 'prueba_aislada', password }) });
  expect(nuevo.status).toBe(201);
  const datos = await nuevo.json() as { usuario: { id: number } };
  expect(JSON.stringify(datos)).not.toContain('password_hash');
  expect(await verificarPassword(password, await guardado(datos.usuario.id))).toBe(true);
  const sesion = (await entrar('prueba_aislada')).headers.get('Set-Cookie')!.split(';')[0];
  const claveNueva = 'Otra clave de prueba';
  const cambio = await SELF.fetch('https://example.com/api/usuarios/password', { method: 'PATCH',
    headers: { Cookie: cookies.coordinador, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: datos.usuario.id, password: claveNueva }) });
  expect(cambio.status).toBe(200);
  expect(await verificarPassword(claveNueva, await guardado(datos.usuario.id))).toBe(true);
  expect((await entrar('prueba_aislada')).status).toBe(401);
  expect((await entrar('prueba_aislada', claveNueva)).status).toBe(200);
  expect((await SELF.fetch('https://example.com/api/auth/me', { headers: { Cookie: sesion } })).status).toBe(401);
});

it('Cambiar clave del coordinador usa hash, conserva login e invalida sesión anterior', async () => {
  await env.DB.prepare('UPDATE usuarios SET password_hash = ? WHERE id = 1').bind(await crearPasswordHash(password)).run();
  const claveNueva = 'Clave nueva coordinador';
  const cambio = await SELF.fetch('https://example.com/api/coordinador/password', { method: 'PATCH',
    headers: { Cookie: cookies.coordinador, 'Content-Type': 'application/json' },
    body: JSON.stringify({ passwordActual: password, passwordNueva: claveNueva }) });
  expect(cambio.status).toBe(200);
  expect(await verificarPassword(claveNueva, await guardado(1))).toBe(true);
  expect((await entrar('coordinador')).status).toBe(401);
  expect((await entrar('coordinador', claveNueva)).status).toBe(200);
  expect((await SELF.fetch('https://example.com/api/auth/me', { headers: { Cookie: cookies.coordinador } })).status).toBe(401);
});

it.each([[42, password], ['juan', 42], ['juan', null]])('Payload de login inválido devuelve 400 (%j)', async (user, clave) => {
  expect((await entrar(user, clave)).status).toBe(400);
});
