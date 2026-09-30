import { verificarPassword } from '../services/passwordService'
import {
  crearCookieSesion,
  crearSesion,
  eliminarCookieSesion,
  eliminarSesion,
  obtenerUsuarioSesion,
} from '../services/sessionService'

type UsuarioLogin = {
  id: number
  nombre: string
  user: string
  password_hash: string | null
  rol: 'coordinador' | 'tecnico'
  activo: number
}

type LoginBody = {
  user?: string
  password?: string
}

export async function login(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = await request.json<LoginBody>()

    const user = body.user?.trim().toLowerCase()
    const password = body.password

    if (!user || !password) {
      return Response.json(
        {
          status: 'error',
          message: 'user y password son obligatorios',
        },
        {
          status: 400,
        },
      )
    }

    const usuario = await env.DB
      .prepare(`
        SELECT
          id,
          nombre,
          user,
          password_hash,
          rol,
          activo
        FROM usuarios
        WHERE user = ?
        LIMIT 1
      `)
      .bind(user)
      .first<UsuarioLogin>()

    if (!usuario || !usuario.password_hash) {
      return credencialesIncorrectas()
    }

    const passwordValida = await verificarPassword(
      password,
      usuario.password_hash,
    )

    if (!passwordValida) {
      return credencialesIncorrectas()
    }

    if (usuario.activo !== 1) {
      return Response.json(
        {
          status: 'error',
          message: 'Usuario inactivo',
        },
        {
          status: 403,
        },
      )
    }

    const token = await crearSesion(
      env,
      usuario.id,
    )

    return Response.json(
      {
        status: 'ok',
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          user: usuario.user,
          rol: usuario.rol,
        },
      },
      {
        headers: {
          'Set-Cookie': crearCookieSesion(
            request,
            token,
          ),
        },
      },
    )
  } catch {
    return Response.json(
      {
        status: 'error',
        message: 'No se pudo iniciar sesión',
      },
      {
        status: 500,
      },
    )
  }
}

export async function obtenerSesionActual(
  request: Request,
  env: Env,
): Promise<Response> {
  const usuario = await obtenerUsuarioSesion(
    request,
    env,
  )

  if (!usuario) {
    return Response.json(
      {
        status: 'error',
        message: 'No autenticado',
      },
      {
        status: 401,
      },
    )
  }

  return Response.json({
    status: 'ok',
    usuario,
  })
}

export async function logout(
  request: Request,
  env: Env,
): Promise<Response> {
  await eliminarSesion(
    request,
    env,
  )

  return Response.json(
    {
      status: 'ok',
      message: 'Sesión cerrada',
    },
    {
      headers: {
        'Set-Cookie': eliminarCookieSesion(request),
      },
    },
  )
}

function credencialesIncorrectas(): Response {
  return Response.json(
    {
      status: 'error',
      message: 'Usuario o contraseña incorrectos',
    },
    {
      status: 401,
    },
  )
}