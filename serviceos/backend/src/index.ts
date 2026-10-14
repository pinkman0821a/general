import { login, logout, obtenerSesionActual } from './routes/auth';
import { actualizarCoordinador, cambiarPasswordCoordinador } from './routes/coordinador';
import { databaseStatusResponse } from './routes/databaseStatus';
import { healthResponse } from './routes/health';
import { crearSkill, listarSkills } from './routes/skills';
import { listarTecnicos } from './routes/tecnicos';
import { gestionarTecnicoDisponibilidad } from './routes/tecnicoDisponibilidad';
import { gestionarTecnicoSkills } from './routes/tecnicoSkills';
import { actualizarDatosTecnico } from './routes/usuarioDatos';
import { cambiarEstadoUsuario } from './routes/usuarioEstado';
import { cambiarPasswordTecnico } from './routes/usuarioPassword';
import { crearUsuario, listarUsuarios } from './routes/usuarios';
import { gestionarTaller } from './routes/taller';
import { gestionarTallerCatalogo } from './routes/tallerCatalogo';
import { gestionarServicios } from './routes/servicios';
import { gestionarServicioComprobante } from './routes/servicioComprobante';
import { gestionarComisiones } from './routes/comisiones';
import { gestionarFinanzas } from './routes/finanzas';
import { resumenFinancieroTecnico } from './routes/tecnicoResumenFinanciero';
import { gestionarAgenda } from './routes/agenda';
import { gestionarServicioFotos } from './routes/servicioFotos';

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		const fotos = url.pathname.match(/^\/api\/servicios\/([^/]+)\/fotos(?:\/([^/]+))?$/);
		if (fotos && (fotos[2] ? ['GET', 'DELETE'] : ['GET', 'POST']).includes(request.method)) return gestionarServicioFotos(request, env, fotos[1], fotos[2]);
		if (request.method === 'GET' && ['/api/agenda', '/api/inicio/resumen'].includes(url.pathname)) return gestionarAgenda(request, env, url.pathname.endsWith('/resumen'));
		if (url.pathname === '/api/tecnico/resumen-financiero' && request.method === 'GET') return resumenFinancieroTecnico(request, env);
		if (url.pathname === '/api/finanzas/resumen' && request.method === 'GET') return gestionarFinanzas(request, env);
		const finanzasTecnico = url.pathname.match(/^\/api\/finanzas\/tecnicos\/([^/]+)$/);
		if (finanzasTecnico && request.method === 'GET') return gestionarFinanzas(request, env, finanzasTecnico[1]);
		if (request.method === 'GET' && ['/api/servicios/comisiones.xlsx', '/api/servicios/resumen-pagos'].includes(url.pathname)) {
			return gestionarComisiones(request, env, url.pathname.endsWith('resumen-pagos'));
		}
		const comprobante = url.pathname.match(/^\/api\/servicios\/([^/]+)\/comprobante$/);
		if (comprobante && ['GET', 'PUT', 'DELETE'].includes(request.method)) {
			return gestionarServicioComprobante(request, env, comprobante[1]);
		}
		if (url.pathname === '/api/servicios' && ['GET', 'POST'].includes(request.method)) {
			return gestionarServicios(request, env);
		}
		const servicio = url.pathname.match(/^\/api\/servicios\/([^/]+)$/);
		if (servicio && ['GET', 'PATCH', 'DELETE'].includes(request.method)) {
			return gestionarServicios(request, env, servicio[1]);
		}
		const estadoServicio = url.pathname.match(/^\/api\/servicios\/([^/]+)\/estado$/);
		if (estadoServicio && request.method === 'PATCH') {
			return gestionarServicios(request, env, estadoServicio[1], true);
		}

		if (url.pathname === '/api/taller/accesorios-catalogo' && ['GET', 'POST'].includes(request.method)) {
			return gestionarTallerCatalogo(request, env);
		}
		const accesorioCatalogo = url.pathname.match(/^\/api\/taller\/accesorios-catalogo\/([^/]+)$/);
		if (accesorioCatalogo && request.method === 'DELETE') {
			return gestionarTallerCatalogo(request, env, accesorioCatalogo[1]);
		}

		if (url.pathname === '/api/taller' && ['GET', 'POST'].includes(request.method)) {
			return gestionarTaller(request, env);
		}
		const recepcionTaller = url.pathname.match(/^\/api\/taller\/([^/]+)$/);
		if (recepcionTaller && ['GET', 'PATCH'].includes(request.method)) {
			return gestionarTaller(request, env, recepcionTaller[1]);
		}
		const entregaTaller = url.pathname.match(/^\/api\/taller\/([^/]+)\/entrega$/);
		if (entregaTaller && request.method === 'PUT') {
			return gestionarTaller(request, env, entregaTaller[1], true);
		}

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

		if (url.pathname === '/api/skills') {
			if (request.method === 'GET') return listarSkills(request, env);
			if (request.method === 'POST') return crearSkill(request, env);
		}

		const skillsTecnico = url.pathname.match(/^\/api\/tecnicos\/([^/]+)\/skills$/);
		if (skillsTecnico && (request.method === 'GET' || request.method === 'POST')) {
			return gestionarTecnicoSkills(request, env, skillsTecnico[1]);
		}

		const skillTecnico = url.pathname.match(/^\/api\/tecnicos\/([^/]+)\/skills\/([^/]+)$/);
		if (skillTecnico && request.method === 'DELETE') {
			return gestionarTecnicoSkills(request, env, skillTecnico[1], skillTecnico[2]);
		}

		const disponibilidad = url.pathname.match(/^\/api\/tecnicos\/([^/]+)\/disponibilidad$/);
		if (disponibilidad && (request.method === 'GET' || request.method === 'POST')) {
			return gestionarTecnicoDisponibilidad(request, env, disponibilidad[1]);
		}

		const indisponibilidad = url.pathname.match(/^\/api\/tecnicos\/([^/]+)\/disponibilidad\/([^/]+)$/);
		if (indisponibilidad && request.method === 'DELETE') {
			return gestionarTecnicoDisponibilidad(request, env, indisponibilidad[1], indisponibilidad[2]);
		}

		if (request.method === 'GET' && url.pathname === '/') {
			return Response.json({
				app: 'ServiceOS API',
				version: '0.3.0-rc.2',
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
