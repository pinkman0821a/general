export type AccesorioCatalogoDb = { id: number; nombre: string; created_at: string };

export function listarAccesoriosCatalogo(env: Env) {
  return env.DB.prepare('SELECT id, nombre, created_at FROM taller_catalogo_accesorios ORDER BY nombre ASC')
    .all<AccesorioCatalogoDb>();
}

export function crearAccesorioCatalogo(env: Env, nombre: string) {
  return env.DB.prepare(`INSERT INTO taller_catalogo_accesorios (nombre) VALUES (?)
    ON CONFLICT (nombre) DO NOTHING RETURNING id, nombre, created_at`)
    .bind(nombre).first<AccesorioCatalogoDb>();
}

export function eliminarAccesorioCatalogo(env: Env, id: number) {
  // Solo esta tabla: no hay vínculos ni cascadas hacia los snapshots históricos.
  return env.DB.prepare('DELETE FROM taller_catalogo_accesorios WHERE id = ?').bind(id).run();
}
