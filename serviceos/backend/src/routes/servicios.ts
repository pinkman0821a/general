import { obtenerUsuarioSesion } from '../services/sessionService';
import { detalleServicio, guardarEstadoServicio, guardarServicio, listarServicios } from '../services/serviciosService';
import { ErrorServicio, ErrorSobrecarga, respuestaServicio, validarEstado, validarServicio } from '../services/serviciosValidacion';
import { errorRuta, idRuta, leerObjeto } from './rutaComun';
import { eliminarServicio } from '../services/servicioEliminacion';

export async function gestionarServicios(request: Request, env: Env, valorId?: string, cambiarEstado = false) {
	try {
		const usuario = await obtenerUsuarioSesion(request, env);
		if (!usuario) return errorRuta('No autenticado', 401);
		if ((request.method === 'DELETE' || request.method === 'POST' || (request.method === 'PATCH' && !cambiarEstado)) && usuario.rol !== 'coordinador') {
			return errorRuta(request.method === 'DELETE' ? 'Solo el coordinador puede eliminar servicios' : 'Solo el coordinador puede crear o editar servicios', 403);
		}
		if (valorId === undefined && request.method === 'GET') {
			const servicios = await listarServicios(env, new URL(request.url).searchParams, usuario);
			return Response.json({ status: 'ok', servicios });
		}
		const id = valorId === undefined ? null : idRuta(valorId);
		if (valorId !== undefined && id === null) return errorRuta('ID de servicio inválido', 400);
		const actual = id === null ? null : await detalleServicio(env, id);
		if (id !== null && !actual) return errorRuta('Servicio no encontrado', 404);
		if (actual && usuario.rol === 'tecnico' && actual.tecnico_id !== usuario.id) return errorRuta('Servicio ajeno', 403);
		if (request.method === 'GET' && actual) return Response.json({ status: 'ok', servicio: respuestaServicio(actual, usuario.rol, true) });
		if (request.method === 'DELETE' && actual) {
			await eliminarServicio(env, actual);
			return Response.json({ status: 'ok', message: 'Servicio eliminado correctamente.' });
		}
		const body = await leerObjeto(request);
		if (!body) return errorRuta('Cuerpo JSON inválido', 400);
		const servicio = cambiarEstado && id !== null
			? await guardarEstadoServicio(env, id, validarEstado(body), usuario)
			: await guardarServicio(env, validarServicio(body, actual ?? undefined), actual ?? undefined, body.confirmar_sobrecarga === true);
		return Response.json({ status: 'ok', servicio: respuestaServicio(servicio, usuario.rol, true) }, { status: id === null ? 201 : 200 });
	} catch (error) {
		if (error instanceof ErrorSobrecarga) return Response.json({
			status: 'error', message: error.message, codigo: 'sobrecarga_agenda',
			presenciales_existentes: error.presencialesExistentes,
			presenciales_resultantes: error.presencialesExistentes + 1,
		}, { status: 409 });
		if (error instanceof ErrorServicio) return errorRuta(error.message, error.status);
		if (error instanceof Error && /CHECK constraint failed|FOREIGN KEY constraint failed/.test(error.message)) return errorRuta('Datos de servicio inválidos', 400);
		return errorRuta('No se pudo gestionar el servicio', 500);
	}
}
