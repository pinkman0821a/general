export type SkillDb = {
	id: number;
	nombre: string;
	created_at: string;
};

export function listarCatalogoSkills(env: Env) {
	return env.DB.prepare('SELECT id, nombre, created_at FROM skills ORDER BY nombre ASC')
		.all<SkillDb>();
}

export function insertarSkill(env: Env, nombre: string) {
	return env.DB.prepare(`
		INSERT INTO skills (nombre) VALUES (?)
		ON CONFLICT (nombre) DO NOTHING
		RETURNING id, nombre, created_at
	`).bind(nombre).first<SkillDb>();
}

export function obtenerSkill(env: Env, skillId: number) {
	return env.DB.prepare('SELECT id, nombre, created_at FROM skills WHERE id = ?')
		.bind(skillId).first<SkillDb>();
}

export function listarSkillsAsignadas(env: Env, tecnicoId: number) {
	return env.DB.prepare(`
		SELECT s.id, s.nombre, s.created_at
		FROM skills s
		INNER JOIN tecnico_skills ts ON ts.skill_id = s.id
		WHERE ts.tecnico_id = ?
		ORDER BY s.nombre ASC
	`).bind(tecnicoId).all<SkillDb>();
}

export function insertarAsignacion(env: Env, tecnicoId: number, skillId: number) {
	return env.DB.prepare(`
		INSERT INTO tecnico_skills (tecnico_id, skill_id) VALUES (?, ?)
		ON CONFLICT (tecnico_id, skill_id) DO NOTHING
		RETURNING tecnico_id, skill_id, created_at
	`).bind(tecnicoId, skillId).first<{
		tecnico_id: number;
		skill_id: number;
		created_at: string;
	}>();
}

export function eliminarAsignacion(env: Env, tecnicoId: number, skillId: number) {
	return env.DB.prepare('DELETE FROM tecnico_skills WHERE tecnico_id = ? AND skill_id = ?')
		.bind(tecnicoId, skillId).run();
}
