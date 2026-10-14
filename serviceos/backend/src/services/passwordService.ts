const prefijo = 'pbkdf2-sha256$';
const iteraciones = 100000; // Límite admitido por Web Crypto de Workers.
const encoder = new TextEncoder();

function hexadecimal(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function derivar(password: string, salt: Uint8Array) {
  const clave = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hexadecimal(new Uint8Array(await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', iterations: iteraciones, salt: salt as Uint8Array<ArrayBuffer>,
  }, clave, 256)));
}

export function passwordEsLegacy(valor: string) {
  return !valor.startsWith(prefijo);
}

export async function crearPasswordHash(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${prefijo}${iteraciones}$${hexadecimal(salt)}$${await derivar(password, salt)}`;
}

export async function verificarPassword(password: string, guardado: string): Promise<boolean> {
  // Compatibilidad temporal: login reemplaza el texto legacy tras verificarlo.
  if (passwordEsLegacy(guardado)) return password === guardado;
  const partes = guardado.split('$');
  if (partes.length !== 4 || partes[1] !== String(iteraciones)
    || !/^[a-f0-9]{32}$/.test(partes[2]) || !/^[a-f0-9]{64}$/.test(partes[3])) return false;
  const salt = Uint8Array.from(partes[2].match(/../g)!, par => parseInt(par, 16));
  const calculado = await derivar(password, salt);
  let diferencia = 0;
  for (let i = 0; i < calculado.length; i++) diferencia |= calculado.charCodeAt(i) ^ partes[3].charCodeAt(i);
  return diferencia === 0;
}
