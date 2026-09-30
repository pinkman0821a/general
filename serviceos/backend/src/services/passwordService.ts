const ITERACIONES = 600_000
const LONGITUD_SALT = 16
const LONGITUD_HASH = 256

function bytesABase64(bytes: Uint8Array): string {
  let texto = ''

  for (const byte of bytes) {
    texto += String.fromCharCode(byte)
  }

  return btoa(texto)
}

function base64ABytes(valor: string): Uint8Array {
  const texto = atob(valor)
  const bytes = new Uint8Array(texto.length)

  for (let i = 0; i < texto.length; i += 1) {
    bytes[i] = texto.charCodeAt(i)
  }

  return bytes
}

async function derivarPassword(
  password: string,
  salt: Uint8Array,
  iteraciones: number,
): Promise<Uint8Array> {
  const encoder = new TextEncoder()

  const clave = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const resultado = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: iteraciones,
    },
    clave,
    LONGITUD_HASH,
  )

  return new Uint8Array(resultado)
}

function sonIguales(
  a: Uint8Array,
  b: Uint8Array,
): boolean {
  if (a.length !== b.length) {
    return false
  }

  let diferencia = 0

  for (let i = 0; i < a.length; i += 1) {
    diferencia |= a[i] ^ b[i]
  }

  return diferencia === 0
}

export async function crearPasswordHash(
  password: string,
): Promise<string> {
  const salt = crypto.getRandomValues(
    new Uint8Array(LONGITUD_SALT),
  )

  const hash = await derivarPassword(
    password,
    salt,
    ITERACIONES,
  )

  return [
    'pbkdf2-sha256',
    ITERACIONES,
    bytesABase64(salt),
    bytesABase64(hash),
  ].join('$')
}

export async function verificarPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const partes = passwordHash.split('$')

  if (partes.length !== 4) {
    return false
  }

  const [
    algoritmo,
    iteracionesTexto,
    saltBase64,
    hashBase64,
  ] = partes

  if (algoritmo !== 'pbkdf2-sha256') {
    return false
  }

  const iteraciones = Number(iteracionesTexto)

  if (!Number.isInteger(iteraciones) || iteraciones <= 0) {
    return false
  }

  const salt = base64ABytes(saltBase64)
  const hashGuardado = base64ABytes(hashBase64)

  const hashCalculado = await derivarPassword(
    password,
    salt,
    iteraciones,
  )

  return sonIguales(
    hashCalculado,
    hashGuardado,
  )
}