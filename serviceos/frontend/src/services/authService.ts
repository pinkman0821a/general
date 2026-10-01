export type UsuarioSesion = {
  id: number
  nombre: string
  user: string
  rol: 'coordinador' | 'tecnico'
}

type LoginRespuesta = {
  status: string
  usuario?: UsuarioSesion
  message?: string
}

export async function iniciarSesion(
  user: string,
  password: string,
): Promise<UsuarioSesion> {
  const respuesta = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      user,
      password,
    }),
  })

  const datos = await respuesta.json() as LoginRespuesta

  if (!respuesta.ok || !datos.usuario) {
    throw new Error(
      datos.message ?? 'No se pudo iniciar sesión',
    )
  }

  return datos.usuario
}

export async function obtenerSesion(): Promise<UsuarioSesion | null> {
  const respuesta = await fetch('/api/auth/me', {
    credentials: 'include',
  })

  if (respuesta.status === 401) {
    return null
  }

  if (!respuesta.ok) {
    throw new Error('No se pudo comprobar la sesión')
  }

  const datos = await respuesta.json() as LoginRespuesta

  return datos.usuario ?? null
}

export async function cerrarSesion(): Promise<void> {
  const respuesta = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })

  if (!respuesta.ok) {
    throw new Error('No se pudo cerrar la sesión')
  }
}