import { obtenerUsuarioSesion } from '../services/sessionService';
import { consultarResumenPersonal } from '../services/finanzasConsulta';
import { errorRuta } from './rutaComun';

export async function resumenFinancieroTecnico(request: Request, env: Env) {
	try {
		const usuario = await obtenerUsuarioSesion(request, env);
		if (!usuario) return errorRuta('Sesión requerida', 401);
		if (usuario.rol !== 'tecnico') return errorRuta('Resumen reservado al técnico', 403);
		if (new URL(request.url).search) return errorRuta('El resumen utiliza exclusivamente la sesión y el mes actual', 400);
		return Response.json(await consultarResumenPersonal(env, usuario.id), { headers: { 'Cache-Control': 'no-store' } });
	} catch {
		return errorRuta('No se pudo consultar tu comisión', 500);
	}
}
