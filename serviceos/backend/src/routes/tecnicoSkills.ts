import {
	eliminarAsignacion,
	insertarAsignacion,
	listarSkillsAsignadas,
	obtenerSkill,
	obtenerUsuarioTecnico,
} from '../services/skillService';
import { errorSkills, idRuta, idValido, leerObjeto, protegerSkills } from './skillsComun';

export async function gestionarTecnicoSkills(
	request: Request,
	env: Env,
	tecnicoIdRuta: string,
	skillIdRuta?: string,
): Promise<Response> {
	try {
		const rechazo = await protegerSkills(request, env);
		if (rechazo) return rechazo;

		const tecnicoId = idRuta(tecnicoIdRuta);
		if (tecnicoId === null) return errorSkills('ID de técnico inválido', 400);

		let valorSkillId: unknown;
		if (request.method === 'POST') {
			const body = await leerObjeto(request);
			valorSkillId = body?.skill_id;
		} else if (request.method === 'DELETE') {
			valorSkillId = idRuta(skillIdRuta ?? '');
		}
		const skillId = idValido(valorSkillId) ? valorSkillId : null;
		if (request.method !== 'GET' && skillId === null) {
			return errorSkills('ID de skill inválido', 400);
		}

		const tecnico = await obtenerUsuarioTecnico(env, tecnicoId);
		if (!tecnico) return errorSkills('Técnico no encontrado', 404);
		if (tecnico.rol !== 'tecnico') {
			return errorSkills('Esta acción solo aplica a técnicos', 400);
		}

		if (skillId === null) {
			const resultado = await listarSkillsAsignadas(env, tecnicoId);
			return Response.json({ status: 'ok', skills: resultado.results });
		}

		const skill = await obtenerSkill(env, skillId);
		if (!skill) return errorSkills('Skill no encontrada', 404);

		if (request.method === 'POST') {
			const asignacion = await insertarAsignacion(env, tecnicoId, skillId);
			if (!asignacion) return errorSkills('El técnico ya tiene esa skill', 409);
			return Response.json({ status: 'ok', asignacion }, { status: 201 });
		}

		const resultado = await eliminarAsignacion(env, tecnicoId, skillId);
		if (resultado.meta.changes === 0) {
			return errorSkills('El técnico no tiene esa skill asignada', 404);
		}
		return Response.json({ status: 'ok', message: 'Skill quitada del técnico' });
	} catch {
		return errorSkills('No se pudieron gestionar las skills del técnico', 500);
	}
}
