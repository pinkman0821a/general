export type HealthResponse = {
  status: string
  app: string
  version: string
}

const API_URL = 'http://127.0.0.1:8000'

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/api/health`)

  if (!response.ok) {
    throw new Error('No se pudo conectar con la API de ServiceOS')
  }

  return response.json()
}