import { protegerCoordinador } from './rutaComun';

export { errorRuta as errorSkills, idRuta, idValido, leerObjeto } from './rutaComun';

export async function protegerSkills(request: Request, env: Env): Promise<Response | null> {
	return protegerCoordinador(request, env, 'Solo el coordinador puede administrar skills');
}
