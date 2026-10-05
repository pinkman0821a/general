import { protegerCoordinador } from './rutaComun';

export { errorRuta as errorDisponibilidad } from './rutaComun';

export async function protegerDisponibilidad(request: Request, env: Env): Promise<Response | null> {
	return protegerCoordinador(request, env, 'Solo el coordinador puede administrar disponibilidad');
}

export function fechaValida(valor: unknown): valor is string {
	if (typeof valor !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(valor)) return false;
	if (valor.startsWith('0000-')) return false;
	const fecha = new Date(`${valor}T00:00:00.000Z`);
	return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}
