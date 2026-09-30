import {
  login,
  logout,
  obtenerSesionActual,
} from './routes/auth'
import { databaseStatusResponse } from './routes/databaseStatus'
import { healthResponse } from './routes/health'
import {
  crearUsuario,
  listarUsuarios,
} from './routes/usuarios'

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
      request.method === 'POST'
      && url.pathname === '/api/auth/login'
    ) {
      return login(request, env)
    }

    if (
      request.method === 'GET'
      && url.pathname === '/api/auth/me'
    ) {
      return obtenerSesionActual(request, env)
    }

    if (
      request.method === 'POST'
      && url.pathname === '/api/auth/logout'
    ) {
      return logout(request, env)
    }

    if (
      request.method === 'GET'
      && url.pathname === '/api/usuarios'
    ) {
      return listarUsuarios(request, env)
    }

    if (
      request.method === 'POST'
      && url.pathname === '/api/usuarios'
    ) {
      return crearUsuario(request, env)
    }

    if (
      request.method === 'GET'
      && url.pathname === '/'
    ) {
      return Response.json({
        app: 'ServiceOS API',
        version: '0.0.9',
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