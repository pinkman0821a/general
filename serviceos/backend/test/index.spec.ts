import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

describe('ServiceOS API', () => {
  it('responde correctamente en la ruta principal', async () => {
    const response = await SELF.fetch(
      'https://example.com/',
    )

    expect(response.status).toBe(200)

    const data = await response.json()

    expect(data).toMatchObject({
      app: 'ServiceOS API',
      status: 'running',
    })

    expect(data).toHaveProperty('version')
  })

  it('responde correctamente en health', async () => {
    const response = await SELF.fetch(
      'https://example.com/api/health',
    )

    expect(response.status).toBe(200)

    const data = await response.json()

    expect(data).toMatchObject({
      status: 'ok',
      app: 'ServiceOS',
    })

    expect(data).toHaveProperty('version')
  })

  it('devuelve 404 para una ruta inexistente', async () => {
    const response = await SELF.fetch(
      'https://example.com/api/no-existe',
    )

    expect(response.status).toBe(404)

    expect(await response.json()).toEqual({
      error: 'Ruta no encontrada',
    })
  })
})