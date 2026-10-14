import { obtenerUsuarioSesion } from '../services/sessionService';
import { detalleServicio } from '../services/serviciosService';
import { consultarFotos, fotoPublica, fotoServicio, verFoto } from '../services/fotosConsulta';
import { guardarFotos, eliminarFoto } from '../services/fotosGuardado';
import { ErrorServicio } from '../services/serviciosValidacion';
import { errorRuta, idRuta } from './rutaComun';

export async function gestionarServicioFotos(request: Request, env: Env, valorId: string, valorFoto?: string) {
	try {
		const usuario = await obtenerUsuarioSesion(request, env);
		if (!usuario) return errorRuta('No autenticado', 401);
		if (request.method !== 'GET' && usuario.rol !== 'coordinador') return errorRuta('Solo el coordinador puede administrar fotos', 403);
		const id = idRuta(valorId), fotoId = valorFoto === undefined ? undefined : idRuta(valorFoto);
		if (id === null || fotoId === null) return errorRuta('ID de servicio o foto inválido', 400);
		const servicio = await detalleServicio(env, id);
		if (!servicio) return errorRuta('Servicio no encontrado', 404);
		if (usuario.rol === 'tecnico' && servicio.tecnico_id !== usuario.id) return errorRuta('Servicio ajeno', 403);
		if (request.method === 'GET' && fotoId !== undefined) return await verFoto(env, await fotoServicio(env, id, fotoId));
		const datos = request.method === 'POST' ? await guardarFotos(request, env, id)
			: request.method === 'DELETE' && fotoId !== undefined ? await eliminarFoto(env, id, fotoId)
				: { fotos: (await consultarFotos(env, id)).map(fotoPublica) };
		return Response.json({ status: 'ok', ...datos }, { headers: { 'Cache-Control': 'private, no-store' } });
	} catch (causa) {
		if (causa instanceof ErrorServicio) return errorRuta(causa.message, causa.status);
		return errorRuta('No se pudieron gestionar las fotos del servicio', 500);
	}
}
