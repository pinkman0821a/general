type RolUsuario = 'coordinador' | 'tecnico'

type Usuario = {
  id: number
  nombre: string
  user: string
  rol: RolUsuario
  activo: number
  created_at: string
}

type CrearUsuarioBody = {
  nombre?: string
  user?: string
  rol?: string
}

export async function listarUsuarios(
  env: Env,
): Promise<Response> {
  try {
    const resultado = await env.DB
      .prepare(`
        SELECT
          id,
          nombre,
          user,
          rol,
          activo,
          created_at
        FROM usuarios
        ORDER BY nombre ASC
      `)
      .all<Usuario>()

    return Response.json({
      status: 'ok',
      usuarios: resultado.results,
    })
  } catch {
    return Response.json(
      {
        status: 'error',
        message: 'No se pudieron consultar los usuarios',
      },
      {
        status: 500,
      },
    )
  }
}

export async function crearUsuario(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = await request.json<CrearUsuarioBody>()

    const nombre = body.nombre?.trim()
    const user = body.user?.trim().toLowerCase()
    const rol = body.rol?.trim()

    if (!nombre || !user || !rol) {
      return Response.json(
        {
          status: 'error',
          message: 'nombre, user y rol son obligatorios',
        },
        {
          status: 400,
        },
      )
    }

    if (rol !== 'coordinador' && rol !== 'tecnico') {
      return Response.json(
        {
          status: 'error',
          message: 'El rol debe ser coordinador o tecnico',
        },
        {
          status: 400,
        },
      )
    }

    const existente = await env.DB
      .prepare(`
        SELECT id
        FROM usuarios
        WHERE user = ?
        LIMIT 1
      `)
      .bind(user)
      .first()

    if (existente) {
      return Response.json(
        {
          status: 'error',
          message: 'El usuario ya existe',
        },
        {
          status: 409,
        },
      )
    }

    await env.DB
      .prepare(`
        INSERT INTO usuarios (
          nombre,
          user,
          rol
        )
        VALUES (?, ?, ?)
      `)
      .bind(nombre, user, rol)
      .run()

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
        WHERE user = ?
        LIMIT 1
      `)
      .bind(user)
      .first<Usuario>()

    return Response.json(
      {
        status: 'ok',
        usuario,
      },
      {
        status: 201,
      },
    )
  } catch {
    return Response.json(
      {
        status: 'error',
        message: 'No se pudo crear el usuario',
      },
      {
        status: 500,
      },
    )
  }
}