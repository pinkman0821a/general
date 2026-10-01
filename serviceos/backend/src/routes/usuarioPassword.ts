import { crearPasswordHash } from '../services/passwordService'
import { obtenerUsuarioSesion } from '../services/sessionService'

type CambiarPasswordTecnicoBody = {
  id?: number
  password?: string
}

type UsuarioDb = {
  id: number
  nombre: string
  rol: 'coordinador' | 'tecnico'
}

export async function cambiarPasswordTecnico(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const sesion = await obtenerUsuarioSesion(
      request,
      env,
    )

    if (!sesion) {
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

    if (sesion.rol !== 'coordinador') {
      return Response.json(
        {
          status: 'error',
          message: 'Solo el coordinador puede cambiar contraseñas',
        },
        {
          status: 403,
        },
      )
    }

    const body =
      await request.json<CambiarPasswordTecnicoBody>()

    if (
      !Number.isInteger(body.id)
      || !body.password
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

    if (body.password.length < 8) {
      return Response.json(
        {
          status: 'error',
          message: 'La contraseña debe tener mínimo 8 caracteres',
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
          rol
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
          message: 'Esta acción solo aplica a técnicos',
        },
        {
          status: 400,
        },
      )
    }

    const passwordGuardado =
      await crearPasswordHash(body.password)

    await env.DB
      .prepare(`
        UPDATE usuarios
        SET password_hash = ?
        WHERE id = ?
      `)
      .bind(
        passwordGuardado,
        usuario.id,
      )
      .run()

    await env.DB
      .prepare(`
        DELETE FROM sesiones
        WHERE usuario_id = ?
      `)
      .bind(usuario.id)
      .run()

    return Response.json({
      status: 'ok',
      message: `Contraseña de ${usuario.nombre} actualizada`,
    })
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