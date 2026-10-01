import {
  crearPasswordHash,
  verificarPassword,
} from '../services/passwordService'
import {
  eliminarCookieSesion,
  obtenerUsuarioSesion,
} from '../services/sessionService'

type ActualizarCoordinadorBody = {
  nombre?: string
}

type CambiarPasswordBody = {
  passwordActual?: string
  passwordNueva?: string
}

type UsuarioPassword = {
  password_hash: string | null
}

export async function actualizarCoordinador(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const sesion = await obtenerUsuarioSesion(
      request,
      env,
    )

    if (!sesion) {
      return noAutenticado()
    }

    if (sesion.rol !== 'coordinador') {
      return sinPermiso()
    }

    const body =
      await request.json<ActualizarCoordinadorBody>()

    const nombre = body.nombre?.trim()

    if (!nombre) {
      return Response.json(
        {
          status: 'error',
          message: 'El nombre es obligatorio',
        },
        {
          status: 400,
        },
      )
    }

    if (nombre.length > 80) {
      return Response.json(
        {
          status: 'error',
          message: 'El nombre es demasiado largo',
        },
        {
          status: 400,
        },
      )
    }

    await env.DB
      .prepare(`
        UPDATE usuarios
        SET nombre = ?
        WHERE id = ?
          AND rol = 'coordinador'
      `)
      .bind(
        nombre,
        sesion.id,
      )
      .run()

    return Response.json({
      status: 'ok',
      usuario: {
        id: sesion.id,
        nombre,
        user: sesion.user,
        rol: sesion.rol,
      },
    })
  } catch {
    return Response.json(
      {
        status: 'error',
        message: 'No se pudo actualizar el coordinador',
      },
      {
        status: 500,
      },
    )
  }
}

export async function cambiarPasswordCoordinador(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const sesion = await obtenerUsuarioSesion(
      request,
      env,
    )

    if (!sesion) {
      return noAutenticado()
    }

    if (sesion.rol !== 'coordinador') {
      return sinPermiso()
    }

    const body =
      await request.json<CambiarPasswordBody>()

    const passwordActual = body.passwordActual
    const passwordNueva = body.passwordNueva

    if (!passwordActual || !passwordNueva) {
      return Response.json(
        {
          status: 'error',
          message: 'Debes completar ambas contraseñas',
        },
        {
          status: 400,
        },
      )
    }

    if (passwordNueva.length < 8) {
      return Response.json(
        {
          status: 'error',
          message: 'La nueva contraseña debe tener mínimo 8 caracteres',
        },
        {
          status: 400,
        },
      )
    }

    const usuario = await env.DB
      .prepare(`
        SELECT password_hash
        FROM usuarios
        WHERE id = ?
        LIMIT 1
      `)
      .bind(sesion.id)
      .first<UsuarioPassword>()

    if (!usuario?.password_hash) {
      return Response.json(
        {
          status: 'error',
          message: 'No se encontró la contraseña actual',
        },
        {
          status: 500,
        },
      )
    }

    const passwordValida = await verificarPassword(
      passwordActual,
      usuario.password_hash,
    )

    if (!passwordValida) {
      return Response.json(
        {
          status: 'error',
          message: 'La contraseña actual es incorrecta',
        },
        {
          status: 401,
        },
      )
    }

    const passwordHash = await crearPasswordHash(
      passwordNueva,
    )

    await env.DB
      .prepare(`
        UPDATE usuarios
        SET password_hash = ?
        WHERE id = ?
      `)
      .bind(
        passwordHash,
        sesion.id,
      )
      .run()

    await env.DB
      .prepare(`
        DELETE FROM sesiones
        WHERE usuario_id = ?
      `)
      .bind(sesion.id)
      .run()

    return Response.json(
      {
        status: 'ok',
        message: 'Contraseña actualizada',
      },
      {
        headers: {
          'Set-Cookie': eliminarCookieSesion(request),
        },
      },
    )
  } catch {
    return Response.json(
      {
        status: 'error',
        message: 'No se pudo cambiar la contraseña',
      },
      {
        status: 500,
      },
    )
  }
}

function noAutenticado(): Response {
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

function sinPermiso(): Response {
  return Response.json(
    {
      status: 'error',
      message: 'Solo el coordinador puede modificar estos datos',
    },
    {
      status: 403,
    },
  )
}