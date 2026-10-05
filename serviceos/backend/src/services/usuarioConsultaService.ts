export function obtenerUsuarioRol(env: Env, usuarioId: number) {
	return env.DB.prepare('SELECT id, rol FROM usuarios WHERE id = ?')
		.bind(usuarioId).first<{ id: number; rol: string }>();
}
