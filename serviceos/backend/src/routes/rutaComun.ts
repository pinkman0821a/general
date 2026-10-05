import { obtenerUsuarioSesion } from '../services/sessionService';

export function errorRuta(message: string, status: number): Response {
	return Response.json({ status: 'error', message }, { status });
}

export async function protegerCoordinador(
	request: Request,
	env: Env,
	mensajeProhibido: string,
): Promise<Response | null> {
	const sesion = await obtenerUsuarioSesion(request, env);
	if (!sesion) return errorRuta('No autenticado', 401);
	if (sesion.rol !== 'coordinador') return errorRuta(mensajeProhibido, 403);
	return null;
}

export function idValido(id: unknown): id is number {
	return typeof id === 'number' && Number.isSafeInteger(id) && id > 0;
}

export function idRuta(valor: string): number | null {
	if (!/^[0-9]+$/.test(valor)) return null;
	const id = Number(valor);
	return idValido(id) ? id : null;
}

export async function leerObjeto(request: Request): Promise<Record<string, unknown> | null> {
	try {
		const body: unknown = await request.json();
		return body !== null && typeof body === 'object' && !Array.isArray(body)
			? body as Record<string, unknown>
			: null;
	} catch {
		return null;
	}
}
