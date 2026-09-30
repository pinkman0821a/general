export type ApiHealth = {
  status: string
  app: string
  version: string
}

export async function obtenerEstadoApi(): Promise<ApiHealth> {
  const respuesta = await fetch('/api/health')

  if (!respuesta.ok) {
    throw new Error('No se pudo conectar con ServiceOS API')
  }

  return respuesta.json()
}