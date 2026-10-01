import { obtenerUsuarioSesion } from '../services/sessionService'

type CambiarEstadoBody = {
  id?: number
  activo?: boolean
}

type UsuarioDb = {
  id: number
  nombre: string
  user: string
  rol: 'coordinador' | 'tecnico'
  activo: number
  created_at: string
}

export async function cambiarEstadoUsuario(
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
      await request.json<CambiarEstadoBody>()

    if (
      !Number.isInteger(body.id)
      || typeof body.activo !== 'boolean'
    ) {
      return Response.json(
        {
          status: 'error',
          message: 'Datos inválidos',
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
          rol,
          activo,
          created_at
        FROM usuarios
        WHERE id = ?
        LIMIT 1
      `)
      .bind(body.id)
      .first<UsuarioDb>()

    if (!usuario) {
      return Response.json(
        {
          status: 'error',
          message: 'Usuario no encontrado',
        },
        {
          status: 404,
        },
      )
    }

    if (usuario.rol !== 'tecnico') {
      return Response.json(
        {
          status: 'error',
          message: 'La cuenta del coordinador no se puede desactivar',
        },
        {
          status: 400,
        },
      )
    }

    const activo = body.activo ? 1 : 0

    await env.DB
      .prepare(`
        UPDATE usuarios
        SET activo = ?
        WHERE id = ?
      `)
      .bind(
        activo,
        usuario.id,
      )
      .run()

    if (!body.activo) {
      await env.DB
        .prepare(`
          DELETE FROM sesiones
          WHERE usuario_id = ?
        `)
        .bind(usuario.id)
        .run()
    }

    return Response.json({
      status: 'ok',
      usuario: {
        ...usuario,
        activo,
      },
    })
  } catch {
    return Response.json(
      {
        status: 'error',
        message: 'No se pudo cambiar el estado del técnico',
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
      message: 'Solo el coordinador puede administrar usuarios',
    },
    {
      status: 403,
    },
  )
}