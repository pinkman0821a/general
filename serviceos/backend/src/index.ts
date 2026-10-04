import { login, logout, obtenerSesionActual } from './routes/auth';
import { actualizarCoordinador, cambiarPasswordCoordinador } from './routes/coordinador';
import { databaseStatusResponse } from './routes/databaseStatus';
import { healthResponse } from './routes/health';
import { listarTecnicos } from './routes/tecnicos';
import { actualizarDatosTecnico } from './routes/usuarioDatos';
import { cambiarEstadoUsuario } from './routes/usuarioEstado';
import { cambiarPasswordTecnico } from './routes/usuarioPassword';
import { crearUsuario, listarUsuarios } from './routes/usuarios';

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'GET' && url.pathname === '/api/health') {
			return healthResponse();
		}

		if (request.method === 'GET' && url.pathname === '/api/database/status') {
			return databaseStatusResponse(env);
		}

		if (request.method === 'POST' && url.pathname === '/api/auth/login') {
			return login(request, env);
		}

		if (request.method === 'GET' && url.pathname === '/api/auth/me') {
			return obtenerSesionActual(request, env);
		}

		if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
			return logout(request, env);
		}

		if (request.method === 'PATCH' && url.pathname === '/api/coordinador') {
			return actualizarCoordinador(request, env);
		}

		if (request.method === 'PATCH' && url.pathname === '/api/coordinador/password') {
			return cambiarPasswordCoordinador(request, env);
		}

		if (request.method === 'GET' && url.pathname === '/api/usuarios') {
			return listarUsuarios(request, env);
		}

		if (request.method === 'POST' && url.pathname === '/api/usuarios') {
			return crearUsuario(request, env);
		}

		if (request.method === 'PATCH' && url.pathname === '/api/usuarios/estado') {
			return cambiarEstadoUsuario(request, env);
		}

		if (request.method === 'PATCH' && url.pathname === '/api/usuarios/password') {
			return cambiarPasswordTecnico(request, env);
		}

		if (request.method === 'PATCH' && url.pathname === '/api/usuarios/datos') {
			return actualizarDatosTecnico(request, env);
		}

		if (request.method === 'GET' && url.pathname === '/api/tecnicos') {
			return listarTecnicos(request, env);
		}

		if (request.method === 'GET' && url.pathname === '/') {
			return Response.json({
				app: 'ServiceOS API',
				version: '0.1.1',
				status: 'running',
			});
		}

		return Response.json(
			{
				error: 'Ruta no encontrada',
			},
			{
				status: 404,
			},
		);
	},
} satisfies ExportedHandler<Env>;
