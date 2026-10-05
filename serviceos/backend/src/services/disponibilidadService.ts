export type IndisponibilidadDb = {
	id: number;
	tecnico_id: number;
	fecha: string;
	motivo: string | null;
	created_at: string;
};

export function listarIndisponibilidades(env: Env, tecnicoId: number, desde: string, hasta: string) {
	return env.DB.prepare(`
		SELECT id, tecnico_id, fecha, motivo, created_at
		FROM tecnico_indisponibilidades
		WHERE tecnico_id = ? AND fecha BETWEEN ? AND ?
		ORDER BY fecha ASC
	`).bind(tecnicoId, desde, hasta).all<IndisponibilidadDb>();
}

export function insertarIndisponibilidad(env: Env, tecnicoId: number, fecha: string, motivo: string | null) {
	return env.DB.prepare(`
		INSERT INTO tecnico_indisponibilidades (tecnico_id, fecha, motivo) VALUES (?, ?, ?)
		ON CONFLICT (tecnico_id, fecha) DO NOTHING
		RETURNING id, tecnico_id, fecha, motivo, created_at
	`).bind(tecnicoId, fecha, motivo).first<IndisponibilidadDb>();
}

export function eliminarIndisponibilidad(env: Env, tecnicoId: number, fecha: string) {
	return env.DB.prepare('DELETE FROM tecnico_indisponibilidades WHERE tecnico_id = ? AND fecha = ?')
		.bind(tecnicoId, fecha).run();
}
