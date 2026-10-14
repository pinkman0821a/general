import { protegerCoordinador, errorRuta } from './rutaComun';
import { mesComisiones } from '../services/comisionesConsulta';
import { ErrorServicio } from '../services/serviciosValidacion';
import { consultarAgenda, consultarInicio } from '../services/agendaConsulta';

export async function gestionarAgenda(request: Request, env: Env, inicio = false) {
	try {
		const prohibido = await protegerCoordinador(request, env, 'La agenda global y el Inicio están reservados al coordinador');
		if (prohibido) return prohibido;
		const datos = inicio ? await consultarInicio(env) : await consultarAgenda(env, mesComisiones(new URL(request.url).searchParams));
		return Response.json({ status: 'ok', ...datos }, { headers: { 'Cache-Control': 'no-store' } });
	} catch (error) {
		if (error instanceof ErrorServicio) return errorRuta(error.message, error.status);
		return errorRuta('No se pudo consultar la operación', 500);
	}
}
