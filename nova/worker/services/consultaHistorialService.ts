type MemoriaActual = {
  id: number;
  entidad_id: number;
  valor: string;
  reemplaza_id: number | null;
};

type MemoriaAnterior = {
  id: number;
  valor: string;
};

const ALIAS: Record<string, string> = {
  bici: "bicicleta",
  bicis: "bicicleta",
  bicicleta: "bicicleta",
  bicicletas: "bicicleta",
  carro: "carro",
  carros: "carro",
  moto: "moto",
  motos: "moto",
};

function normalizar(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function obtenerEntidad(texto: string) {
  const palabras = normalizar(texto).split(" ");

  for (const palabra of palabras) {
    if (ALIAS[palabra]) {
      return ALIAS[palabra];
    }
  }

  return null;
}

function obtenerReferenciaColor(texto: string, entidad: string) {
  const normalizado = normalizar(texto);
  const patron = new RegExp(`\\b${entidad}\\s+([a-zñ]+)\\b`);

  const resultado = normalizado.match(patron);

  return resultado?.[1] ?? null;
}

async function buscarActualPorReferencia(
  db: D1Database,
  entidad: string,
  referencia: string,
) {
  const resultado = await db
    .prepare(
      `
      SELECT
        m.id,
        m.entidad_id,
        m.valor,
        m.reemplaza_id
      FROM memorias m
      INNER JOIN entidades e
        ON e.id = m.entidad_id
      WHERE m.estado = 'activa'
        AND e.estado = 'activa'
        AND LOWER(e.nombre_base) = LOWER(?)
        AND LOWER(m.clave) = 'color'
        AND LOWER(m.valor) = LOWER(?)
      ORDER BY m.id DESC
    `,
    )
    .bind(entidad, referencia)
    .all<MemoriaActual>();

  if (resultado.results.length !== 1) {
    return null;
  }

  return resultado.results[0];
}

async function obtenerMemoriaAnterior(db: D1Database, id: number) {
  return db
    .prepare(
      `
      SELECT id, valor
      FROM memorias
      WHERE id = ?
      LIMIT 1
    `,
    )
    .bind(id)
    .first<MemoriaAnterior>();
}

export async function responderConsultaHistorial(
  db: D1Database,
  mensaje: string,
) {
  const texto = normalizar(mensaje);

  if (!texto.includes("antes") && !texto.includes("anterior")) {
    return null;
  }

  if (!texto.includes("color")) {
    return null;
  }

  const entidad = obtenerEntidad(texto);

  if (!entidad) {
    return null;
  }

  const referencia = obtenerReferenciaColor(texto, entidad);

  if (!referencia) {
    return null;
  }

  const actual = await buscarActualPorReferencia(db, entidad, referencia);

  if (!actual || !actual.reemplaza_id) {
    return null;
  }

  const anterior = await obtenerMemoriaAnterior(db, actual.reemplaza_id);

  if (!anterior) {
    return null;
  }

  return `Antes era ${anterior.valor}.`;
}
