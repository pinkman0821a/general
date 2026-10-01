import { obtenerUsuarioSesion } from '../services/sessionService'

type ActualizarTecnicoBody = {
  id?: number
  nombre?: string
  user?: string
}

type UsuarioDb = {
  id: number
  nombre: string
  user: string
  rol: 'coordinador' | 'tecnico'
  activo: number
  created_at: string
}

export async function actualizarDatosTecnico(
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
          message: 'Solo el coordinador puede editar técnicos',
        },
        {
          status: 403,
        },
      )
    }

    const body =
      await request.json<ActualizarTecnicoBody>()

    const nombre = body.nombre?.trim()
    const user = body.user
      ?.trim()
      .toLowerCase()

    if (
      !Number.isInteger(body.id)
      || !nombre
      || !user
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

    if (
      user.length < 3
      || user.length > 40
    ) {
      return Response.json(
        {
          status: 'error',
          message: 'El usuario debe tener entre 3 y 40 caracteres',
        },
        {
          status: 400,
        },
      )
    }

    if (!/^[a-z0-9._-]+$/.test(user)) {
      return Response.json(
        {
          status: 'error',
          message: 'El usuario contiene caracteres no permitidos',
        },
        {
          status: 400,
        },
      )
    }

    const tecnico = await env.DB
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

    if (!tecnico) {
      return Response.json(
        {
          status: 'error',
          message: 'Técnico no encontrado',
        },
        {
          status: 404,
        },
      )
    }

    if (tecnico.rol !== 'tecnico') {
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

    const usuarioExistente = await env.DB
      .prepare(`
        SELECT id
        FROM usuarios
        WHERE user = ?
          AND id != ?
        LIMIT 1
      `)
      .bind(
        user,
        tecnico.id,
      )
      .first<{ id: number }>()

    if (usuarioExistente) {
      return Response.json(
        {
          status: 'error',
          message: 'Ese usuario ya existe',
        },
        {
          status: 409,
        },
      )
    }

    await env.DB
      .prepare(`
        UPDATE usuarios
        SET
          nombre = ?,
          user = ?
        WHERE id = ?
      `)
      .bind(
        nombre,
        user,
        tecnico.id,
      )
      .run()

    return Response.json({
      status: 'ok',
      usuario: {
        ...tecnico,
        nombre,
        user,
      },
    })
  } catch {
    return Response.json(
      {
        status: 'error',
        message: 'No se pudo actualizar el técnico',
      },
      {
        status: 500,
      },
    )
  }
}