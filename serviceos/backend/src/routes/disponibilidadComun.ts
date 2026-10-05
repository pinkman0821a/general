import { protegerCoordinador } from './rutaComun';

export { errorRuta as errorDisponibilidad } from './rutaComun';

export async function protegerDisponibilidad(request: Request, env: Env): Promise<Response | null> {
	return protegerCoordinador(request, env, 'Solo el coordinador puede administrar disponibilidad');
}

export { fechaValida } from '../utils/fecha';
