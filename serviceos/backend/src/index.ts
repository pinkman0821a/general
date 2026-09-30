import { databaseStatusResponse } from './routes/databaseStatus'
import { healthResponse } from './routes/health'

export default {
  async fetch(
    request,
    env,
  ): Promise<Response> {
    const url = new URL(request.url)

    if (
      request.method === 'GET'
      && url.pathname === '/api/health'
    ) {
      return healthResponse()
    }

    if (
      request.method === 'GET'
      && url.pathname === '/api/database/status'
    ) {
      return databaseStatusResponse(env)
    }

    if (
      request.method === 'GET'
      && url.pathname === '/'
    ) {
      return Response.json({
        app: 'ServiceOS API',
        version: '0.0.8',
        status: 'running',
      })
    }

    return Response.json(
      {
        error: 'Ruta no encontrada',
      },
      {
        status: 404,
      },
    )
  },
} satisfies ExportedHandler<Env>