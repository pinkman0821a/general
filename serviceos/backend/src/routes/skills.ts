import { insertarSkill, listarCatalogoSkills } from '../services/skillService';
import { errorSkills, leerObjeto, protegerSkills } from './skillsComun';

export async function listarSkills(request: Request, env: Env): Promise<Response> {
	try {
		const rechazo = await protegerSkills(request, env);
		if (rechazo) return rechazo;

		const resultado = await listarCatalogoSkills(env);
		return Response.json({ status: 'ok', skills: resultado.results });
	} catch {
		return errorSkills('No se pudieron cargar las skills', 500);
	}
}

export async function crearSkill(request: Request, env: Env): Promise<Response> {
	try {
		const rechazo = await protegerSkills(request, env);
		if (rechazo) return rechazo;

		const body = await leerObjeto(request);
		const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : '';
		if (!nombre) return errorSkills('El nombre de la skill es obligatorio', 400);

		const skill = await insertarSkill(env, nombre);
		if (!skill) return errorSkills('Esa skill ya existe', 409);

		return Response.json({ status: 'ok', skill }, { status: 201 });
	} catch {
		return errorSkills('No se pudo crear la skill', 500);
	}
}
