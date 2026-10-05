import { obtenerUsuarioSesion } from '../services/sessionService';
import { crearRecepcion, detalleTaller, editarRecepcion, guardarEntrega, listarTaller } from '../services/tallerService';
import { ErrorTaller, validarEntrega, validarRecepcion } from '../services/tallerValidacion';
import { errorRuta, idRuta, leerObjeto } from './rutaComun';

export async function gestionarTaller(request: Request, env: Env, valorId?: string, entrega = false) {
	try {
		const usuario = await obtenerUsuarioSesion(request, env);
		if (!usuario) return errorRuta('No autenticado', 401);
		if (['POST', 'PATCH'].includes(request.method) && usuario.rol !== 'coordinador') {
			return errorRuta('Solo el coordinador puede crear o editar recepciones', 403);
		}
		if (valorId === undefined && request.method === 'GET') {
			const parametros = new URL(request.url).searchParams;
			const estado = parametros.get('estado');
			const buscar = parametros.get('buscar');
			if ((estado !== null && !['en_taller', 'entregada'].includes(estado))
				|| parametros.getAll('estado').length > 1 || parametros.getAll('buscar').length > 1
				|| (buscar !== null && !buscar.trim())
				|| [...parametros.keys()].some((clave) => !['estado', 'buscar'].includes(clave))) {
				return errorRuta('Filtros de taller inválidos', 400);
			}
			const resultado = await listarTaller(env, estado, buscar?.trim() ?? null);
			return Response.json({ status: 'ok', recepciones: resultado.results });
		}
		const id = valorId === undefined ? null : idRuta(valorId);
		if (valorId !== undefined && id === null) return errorRuta('ID de recepción inválido', 400);
		const actual = id === null ? null : await detalleTaller(env, id);
		if (id !== null && !actual) return errorRuta('Recepción no encontrada', 404);
		if (request.method === 'GET') return Response.json({ status: 'ok', recepcion: actual });
		const body = await leerObjeto(request);
		if (!body) return errorRuta('Cuerpo JSON inválido', 400);
		if (entrega && id !== null && actual) {
			const { fecha, ids } = validarEntrega(body, actual.fecha_ingreso);
			const recepcion = await guardarEntrega(env, id, fecha, ids);
			return Response.json({ status: 'ok', recepcion });
		}
		const { datos, accesorios } = validarRecepcion(body, actual ?? undefined);
		const recepcion = id === null
			? await crearRecepcion(env, datos, accesorios ?? [])
			: await editarRecepcion(env, id, datos, accesorios);
		return Response.json({ status: 'ok', recepcion }, { status: id === null ? 201 : 200 });
	} catch (error) {
		if (error instanceof ErrorTaller) return errorRuta(error.message, error.status);
		if (error instanceof Error && /CHECK constraint failed|UNIQUE constraint failed/.test(error.message)) {
			return errorRuta('Datos de recepción o accesorios inválidos', 400);
		}
		return errorRuta('No se pudo gestionar el taller', 500);
	}
}
