import {
	eliminarIndisponibilidad,
	insertarIndisponibilidad,
	listarIndisponibilidades,
} from '../services/disponibilidadService';
import { obtenerUsuarioRol } from '../services/usuarioConsultaService';
import { errorDisponibilidad, fechaValida, protegerDisponibilidad } from './disponibilidadComun';
import { idRuta, leerObjeto } from './rutaComun';

export async function gestionarTecnicoDisponibilidad(
	request: Request,
	env: Env,
	tecnicoIdRuta: string,
	fechaRuta?: string,
): Promise<Response> {
	try {
		const rechazo = await protegerDisponibilidad(request, env);
		if (rechazo) return rechazo;

		const tecnicoId = idRuta(tecnicoIdRuta);
		if (tecnicoId === null) return errorDisponibilidad('ID de técnico inválido', 400);
		const tecnico = await obtenerUsuarioRol(env, tecnicoId);
		if (!tecnico) return errorDisponibilidad('Técnico no encontrado', 404);
		if (tecnico.rol !== 'tecnico') {
			return errorDisponibilidad('Esta acción solo aplica a técnicos', 400);
		}

		if (request.method === 'GET') {
			const parametros = new URL(request.url).searchParams;
			const desde = parametros.get('desde');
			const hasta = parametros.get('hasta');
			if (!fechaValida(desde) || !fechaValida(hasta)
				|| parametros.getAll('desde').length !== 1 || parametros.getAll('hasta').length !== 1) {
				return errorDisponibilidad('El rango debe contener desde y hasta en formato YYYY-MM-DD válidos', 400);
			}
			if (desde > hasta) return errorDisponibilidad('Desde no puede ser posterior a hasta', 400);
			const resultado = await listarIndisponibilidades(env, tecnicoId, desde, hasta);
			return Response.json({ status: 'ok', indisponibilidades: resultado.results });
		}

		if (request.method === 'POST') {
			const body = await leerObjeto(request);
			if (!body || !fechaValida(body.fecha)) return errorDisponibilidad('Fecha inválida; usa YYYY-MM-DD', 400);
			const valorMotivo = body?.motivo;
			if (valorMotivo !== undefined && valorMotivo !== null
				&& (typeof valorMotivo !== 'string' || !valorMotivo.trim())) {
				return errorDisponibilidad('El motivo debe ser un texto no vacío o null', 400);
			}
			const motivo = typeof valorMotivo === 'string' ? valorMotivo.trim() : null;
			const indisponibilidad = await insertarIndisponibilidad(env, tecnicoId, body.fecha, motivo);
			if (!indisponibilidad) return errorDisponibilidad('El técnico ya está indisponible en esa fecha', 409);
			return Response.json({ status: 'ok', indisponibilidad }, { status: 201 });
		}

		if (!fechaValida(fechaRuta)) return errorDisponibilidad('Fecha inválida; usa YYYY-MM-DD', 400);
		const resultado = await eliminarIndisponibilidad(env, tecnicoId, fechaRuta);
		if (resultado.meta.changes === 0) return errorDisponibilidad('Indisponibilidad no encontrada', 404);
		return Response.json({ status: 'ok', message: 'Indisponibilidad eliminada' });
	} catch {
		return errorDisponibilidad('No se pudo gestionar la disponibilidad del técnico', 500);
	}
}
