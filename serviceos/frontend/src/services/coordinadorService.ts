import type { UsuarioSesion } from './authService'

type ActualizarCoordinadorRespuesta = {
  status: string
  usuario?: UsuarioSesion
  message?: string
}

type CambiarPasswordRespuesta = {
  status: string
  message?: string
}

export async function actualizarNombreCoordinador(
  nombre: string,
): Promise<UsuarioSesion> {
  const respuesta = await fetch('/api/coordinador', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      nombre,
    }),
  })

  const datos =
    await respuesta.json() as ActualizarCoordinadorRespuesta

  if (!respuesta.ok || !datos.usuario) {
    throw new Error(
      datos.message
        ?? 'No se pudo actualizar el coordinador',
    )
  }

  return datos.usuario
}

export async function cambiarPasswordCoordinador(
  passwordActual: string,
  passwordNueva: string,
): Promise<void> {
  const respuesta = await fetch(
    '/api/coordinador/password',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        passwordActual,
        passwordNueva,
      }),
    },
  )

  const datos =
    await respuesta.json() as CambiarPasswordRespuesta

  if (!respuesta.ok) {
    throw new Error(
      datos.message
        ?? 'No se pudo cambiar la contraseña',
    )
  }
}