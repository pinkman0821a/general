export type NuevaMemoria = {
  tipo: string;
  entidad?: string | null;
  entidadId?: number | null;
  clave: string;
  valor: string;
  confianza?: number;
  importancia?: number;
  fuente?: string;
  reemplazaId?: number | null;
};

export type Memoria = {
  id: number;
  tipo: string;
  entidad: string | null;
  entidad_id: number | null;
  clave: string;
  valor: string;
  confianza: number;
  importancia: number;
  fuente: string;
  estado: string;
  reemplaza_id: number | null;
  creada_en: string;
  actualizada_en: string;
};

export async function guardarMemoria(
  db: D1Database,
  memoria: NuevaMemoria,
) {
  return db
    .prepare(`
      INSERT INTO memorias (
        tipo,
        entidad,
        entidad_id,
        clave,
        valor,
        confianza,
        importancia,
        fuente,
        reemplaza_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      memoria.tipo,
      memoria.entidad ?? null,
      memoria.entidadId ?? null,
      memoria.clave,
      memoria.valor,
      memoria.confianza ?? 1,
      memoria.importancia ?? 5,
      memoria.fuente ?? "conversacion",
      memoria.reemplazaId ?? null,
    )
    .run();
}

export async function obtenerMemoriasActivas(
  db: D1Database,
  limite = 50,
) {
  const resultado = await db
    .prepare(`
      SELECT *
      FROM memorias
      WHERE estado = 'activa'
      ORDER BY importancia DESC, actualizada_en DESC
      LIMIT ?
    `)
    .bind(limite)
    .all<Memoria>();

  return resultado.results;
}

export async function obtenerHistorialMemorias(
  db: D1Database,
  limite = 100,
) {
  const resultado = await db
    .prepare(`
      SELECT *
      FROM memorias
      WHERE estado != 'activa'
      ORDER BY actualizada_en DESC
      LIMIT ?
    `)
    .bind(limite)
    .all<Memoria>();

  return resultado.results;
}

export async function buscarMemoriasPorClave(
  db: D1Database,
  clave: string,
) {
  const resultado = await db
    .prepare(`
      SELECT *
      FROM memorias
      WHERE estado = 'activa'
        AND clave = ?
      ORDER BY importancia DESC, actualizada_en DESC
    `)
    .bind(clave)
    .all<Memoria>();

  return resultado.results;
}

export async function buscarMemoriaActiva(
  db: D1Database,
  tipo: string,
  entidad: string | null,
  clave: string,
) {
  return db
    .prepare(`
      SELECT *
      FROM memorias
      WHERE estado = 'activa'
        AND LOWER(tipo) = LOWER(?)
        AND LOWER(COALESCE(entidad, '')) = LOWER(?)
        AND LOWER(clave) = LOWER(?)
      ORDER BY actualizada_en DESC
      LIMIT 1
    `)
    .bind(
      tipo.trim(),
      (entidad ?? "").trim(),
      clave.trim(),
    )
    .first<Memoria>();
}

export async function buscarMemoriaActivaPorEntidadId(
  db: D1Database,
  entidadId: number,
  clave: string,
) {
  return db
    .prepare(`
      SELECT *
      FROM memorias
      WHERE estado = 'activa'
        AND entidad_id = ?
        AND LOWER(clave) = LOWER(?)
      ORDER BY actualizada_en DESC
      LIMIT 1
    `)
    .bind(
      entidadId,
      clave.trim(),
    )
    .first<Memoria>();
}

export async function obtenerMemoriasPorEntidadId(
  db: D1Database,
  entidadId: number,
) {
  const resultado = await db
    .prepare(`
      SELECT *
      FROM memorias
      WHERE entidad_id = ?
      ORDER BY creada_en ASC
    `)
    .bind(entidadId)
    .all<Memoria>();

  return resultado.results;
}

export async function desactivarMemoria(
  db: D1Database,
  id: number,
) {
  return db
    .prepare(`
      UPDATE memorias
      SET estado = 'reemplazada',
          actualizada_en = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(id)
    .run();
}