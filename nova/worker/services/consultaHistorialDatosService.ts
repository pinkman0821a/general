export type RegistroColor = {
  entidad_id: number;
  id: number;
  valor: string;
  estado: string;
  reemplaza_id: number | null;
};

export type HistorialEntidad = {
  entidadId: number;
  actual: RegistroColor;
  memorias: RegistroColor[];
};

export function normalizar(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function contieneValor(
  texto: string,
  valor: string,
) {
  const contenido = ` ${normalizar(texto)} `;
  const referencia = ` ${normalizar(valor)} `;

  return contenido.includes(referencia);
}

export async function obtenerRegistrosColor(
  db: D1Database,
  entidad: string,
) {
  const resultado = await db
    .prepare(`
      SELECT
        e.id AS entidad_id,
        m.id,
        m.valor,
        m.estado,
        m.reemplaza_id
      FROM entidades e
      INNER JOIN memorias m
        ON m.entidad_id = e.id
      WHERE e.estado = 'activa'
        AND LOWER(e.nombre_base) = LOWER(?)
        AND LOWER(m.clave) = 'color'
      ORDER BY e.id ASC, m.id ASC
    `)
    .bind(entidad)
    .all<RegistroColor>();

  return resultado.results;
}

export function agruparHistoriales(
  registros: RegistroColor[],
) {
  const grupos =
    new Map<number, RegistroColor[]>();

  for (const registro of registros) {
    const grupo =
      grupos.get(registro.entidad_id) ?? [];

    grupo.push(registro);

    grupos.set(
      registro.entidad_id,
      grupo,
    );
  }

  const historiales: HistorialEntidad[] = [];

  for (const [entidadId, memorias] of grupos) {
    const actual = memorias.find(
      (memoria) =>
        memoria.estado === "activa",
    );

    if (!actual) {
      continue;
    }

    historiales.push({
      entidadId,
      actual,
      memorias,
    });
  }

  return historiales;
}

export function obtenerReferenciaAntesDe(
  texto: string,
  historiales: HistorialEntidad[],
) {
  const contenido = normalizar(texto);

  const valores = [
    ...new Set(
      historiales.flatMap(
        (historial) =>
          historial.memorias.map(
            (memoria) => memoria.valor,
          ),
      ),
    ),
  ].sort(
    (a, b) =>
      normalizar(b).length -
      normalizar(a).length,
  );

  for (const valor of valores) {
    const referencia = normalizar(valor);

    if (
      contenido.includes(
        `antes de ${referencia}`,
      )
    ) {
      return valor;
    }
  }

  return null;
}

export function seleccionarPorColorActual(
  texto: string,
  historiales: HistorialEntidad[],
) {
  const coincidencias = historiales.filter(
    (historial) =>
      contieneValor(
        texto,
        historial.actual.valor,
      ),
  );

  return coincidencias.length === 1
    ? coincidencias[0]
    : null;
}

export function seleccionarPorHistorial(
  referencia: string,
  historiales: HistorialEntidad[],
) {
  const coincidencias = historiales.filter(
    (historial) =>
      historial.memorias.some(
        (memoria) =>
          normalizar(memoria.valor) ===
          normalizar(referencia),
      ),
  );

  return coincidencias.length === 1
    ? coincidencias[0]
    : null;
}