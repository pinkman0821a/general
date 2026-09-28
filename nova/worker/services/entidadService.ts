export type NuevaEntidad = {
  tipo: string;
  nombreBase: string;
  etiqueta?: string | null;
};

export type Entidad = {
  id: number;
  tipo: string;
  nombre_base: string;
  etiqueta: string | null;
  estado: string;
  creada_en: string;
  actualizada_en: string;
};

export async function crearEntidad(db: D1Database, entidad: NuevaEntidad) {
  const resultado = await db
    .prepare(
      `
      INSERT INTO entidades (
        tipo,
        nombre_base,
        etiqueta
      )
      VALUES (?, ?, ?)
    `,
    )
    .bind(
      entidad.tipo.trim(),
      entidad.nombreBase.trim(),
      entidad.etiqueta?.trim() || null,
    )
    .run();

  return Number(resultado.meta.last_row_id);
}

export async function buscarEntidadesActivas(
  db: D1Database,
  tipo: string,
  nombreBase: string,
) {
  const resultado = await db
    .prepare(
      `
      SELECT *
      FROM entidades
      WHERE estado = 'activa'
        AND LOWER(tipo) = LOWER(?)
        AND LOWER(nombre_base) = LOWER(?)
      ORDER BY creada_en ASC
    `,
    )
    .bind(tipo.trim(), nombreBase.trim())
    .all<Entidad>();

  return resultado.results;
}

export async function buscarEntidadesActivasPorTipo(
  db: D1Database,
  tipo: string,
) {
  const resultado = await db
    .prepare(
      `
      SELECT *
      FROM entidades
      WHERE estado = 'activa'
        AND LOWER(tipo) = LOWER(?)
      ORDER BY
        LENGTH(nombre_base) DESC,
        creada_en ASC
    `,
    )
    .bind(tipo.trim())
    .all<Entidad>();

  return resultado.results;
}

export async function obtenerEntidadPorId(db: D1Database, id: number) {
  return db
    .prepare(
      `
      SELECT *
      FROM entidades
      WHERE id = ?
        AND estado = 'activa'
      LIMIT 1
    `,
    )
    .bind(id)
    .first<Entidad>();
}

export async function actualizarEtiquetaEntidad(
  db: D1Database,
  id: number,
  etiqueta: string,
) {
  return db
    .prepare(
      `
      UPDATE entidades
      SET etiqueta = ?,
          actualizada_en = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    )
    .bind(etiqueta.trim(), id)
    .run();
}
