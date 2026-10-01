export type UsuarioSistema = {
  id: number
  nombre: string
  user: string
  rol: 'coordinador' | 'tecnico'
  activo: number
  created_at: string
}

type ListaUsuariosRespuesta = {
  status: string
  usuarios?: UsuarioSistema[]
  message?: string
}

type UsuarioRespuesta = {
  status: string
  usuario?: UsuarioSistema
  message?: string
}

type RespuestaSimple = {
  status: string
  message?: string
}

export async function listarUsuarios(): Promise<UsuarioSistema[]> {
  const respuesta = await fetch('/api/usuarios', {
    credentials: 'include',
  })

  const datos =
    await respuesta.json() as ListaUsuariosRespuesta

  if (!respuesta.ok || !datos.usuarios) {
    throw new Error(
      datos.message
        ?? 'No se pudieron cargar los usuarios',
    )
  }

  return datos.usuarios
}

export async function crearTecnico(
  nombre: string,
  user: string,
  password: string,
): Promise<UsuarioSistema> {
  const respuesta = await fetch('/api/usuarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      nombre,
      user,
      password,
    }),
  })

  const datos =
    await respuesta.json() as UsuarioRespuesta

  if (!respuesta.ok || !datos.usuario) {
    throw new Error(
      datos.message
        ?? 'No se pudo crear el técnico',
    )
  }

  return datos.usuario
}

export async function actualizarTecnico(
  id: number,
  nombre: string,
  user: string,
): Promise<UsuarioSistema> {
  const respuesta = await fetch(
    '/api/usuarios/datos',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        id,
        nombre,
        user,
      }),
    },
  )

  const datos =
    await respuesta.json() as UsuarioRespuesta

  if (!respuesta.ok || !datos.usuario) {
    throw new Error(
      datos.message
        ?? 'No se pudo actualizar el técnico',
    )
  }

  return datos.usuario
}

export async function cambiarEstadoTecnico(
  id: number,
  activo: boolean,
): Promise<UsuarioSistema> {
  const respuesta = await fetch(
    '/api/usuarios/estado',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        id,
        activo,
      }),
    },
  )

  const datos =
    await respuesta.json() as UsuarioRespuesta

  if (!respuesta.ok || !datos.usuario) {
    throw new Error(
      datos.message
        ?? 'No se pudo cambiar el estado del técnico',
    )
  }

  return datos.usuario
}

export async function cambiarPasswordTecnico(
  id: number,
  password: string,
): Promise<void> {
  const respuesta = await fetch(
    '/api/usuarios/password',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        id,
        password,
      }),
    },
  )

  const datos =
    await respuesta.json() as RespuestaSimple

  if (!respuesta.ok) {
    throw new Error(
      datos.message
        ?? 'No se pudo cambiar la contraseña',
    )
  }
}