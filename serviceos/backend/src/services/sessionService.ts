const COOKIE_NAME = 'serviceos_session'
const SESSION_DAYS = 7
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60

export type UsuarioSesion = {
  id: number
  nombre: string
  user: string
  rol: 'coordinador' | 'tecnico'
}

function generarToken(): string {
  const bytes = crypto.getRandomValues(
    new Uint8Array(32),
  )

  let texto = ''

  for (const byte of bytes) {
    texto += String.fromCharCode(byte)
  }

  return btoa(texto)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function hashToken(
  token: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(token)

  const digest = await crypto.subtle.digest(
    'SHA-256',
    bytes,
  )

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function obtenerCookie(
  request: Request,
  nombre: string,
): string | null {
  const cookieHeader = request.headers.get('Cookie')

  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader.split(';')

  for (const cookie of cookies) {
    const [clave, ...resto] = cookie.trim().split('=')

    if (clave === nombre) {
      return resto.join('=')
    }
  }

  return null
}

export async function crearSesion(
  env: Env,
  usuarioId: number,
): Promise<string> {
  const token = generarToken()
  const tokenHash = await hashToken(token)

  const expiresAt = new Date(
    Date.now() + SESSION_SECONDS * 1000,
  ).toISOString()

  await env.DB
    .prepare(`
      INSERT INTO sesiones (
        usuario_id,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?)
    `)
    .bind(
      usuarioId,
      tokenHash,
      expiresAt,
    )
    .run()

  return token
}

export function crearCookieSesion(
  request: Request,
  token: string,
): string {
  const esHttps = new URL(request.url).protocol === 'https:'

  const partes = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${SESSION_SECONDS}`,
  ]

  if (esHttps) {
    partes.push('Secure')
  }

  return partes.join('; ')
}

export function eliminarCookieSesion(
  request: Request,
): string {
  const esHttps = new URL(request.url).protocol === 'https:'

  const partes = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
  ]

  if (esHttps) {
    partes.push('Secure')
  }

  return partes.join('; ')
}

export async function obtenerUsuarioSesion(
  request: Request,
  env: Env,
): Promise<UsuarioSesion | null> {
  const token = obtenerCookie(
    request,
    COOKIE_NAME,
  )

  if (!token) {
    return null
  }

  const tokenHash = await hashToken(token)
  const ahora = new Date().toISOString()

  return env.DB
    .prepare(`
      SELECT
        u.id,
        u.nombre,
        u.user,
        u.rol
      FROM sesiones s
      INNER JOIN usuarios u
        ON u.id = s.usuario_id
      WHERE s.token_hash = ?
        AND s.expires_at > ?
        AND u.activo = 1
      LIMIT 1
    `)
    .bind(
      tokenHash,
      ahora,
    )
    .first<UsuarioSesion>()
}

export async function eliminarSesion(
  request: Request,
  env: Env,
): Promise<void> {
  const token = obtenerCookie(
    request,
    COOKIE_NAME,
  )

  if (!token) {
    return
  }

  const tokenHash = await hashToken(token)

  await env.DB
    .prepare(`
      DELETE FROM sesiones
      WHERE token_hash = ?
    `)
    .bind(tokenHash)
    .run()
}