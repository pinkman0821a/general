import { healthResponse } from './routes/health'

export default {
  fetch(request): Response {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return healthResponse()
    }

    if (request.method === 'GET' && url.pathname === '/') {
      return Response.json({
        app: 'ServiceOS API',
        version: '0.0.5',
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