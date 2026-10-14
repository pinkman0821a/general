import { protegerCoordinador, errorRuta, idRuta } from './rutaComun';
import { mesComisiones } from '../services/comisionesConsulta';
import { consultarDetalleFinanzas, consultarFinanzas } from '../services/finanzasConsulta';
import { ErrorServicio } from '../services/serviciosValidacion';

export async function gestionarFinanzas(request: Request, env: Env, valorId?: string) {
	try {
		const prohibido = await protegerCoordinador(request, env, 'Finanzas está reservado al coordinador');
		if (prohibido) return prohibido;
		const mes = mesComisiones(new URL(request.url).searchParams);
		const id = valorId === undefined ? undefined : idRuta(valorId);
		if (id === null) return errorRuta('ID de técnico inválido', 400);
		const datos = id === undefined ? await consultarFinanzas(env, mes) : await consultarDetalleFinanzas(env, mes, id);
		return Response.json({ status: 'ok', ...datos }, { headers: { 'Cache-Control': 'no-store' } });
	} catch (error) {
		if (error instanceof ErrorServicio) return errorRuta(error.message, error.status);
		return errorRuta('No se pudo consultar Finanzas', 500);
	}
}
