import type { ConsultaEcho } from "./echoService.js";
import type { Memoria } from "./memoriaService.js";

export type ResultadoBusquedaMemoria = {
  memorias: Memoria[];
  puntajeMaximo: number;
};

const PALABRAS_IGNORADAS = new Set([
  "a", "al", "algo", "como", "cual", "cuando", "de", "del", "donde", "el",
  "ella", "en", "era", "es", "esta", "este", "fue", "la", "las", "lo",
  "los", "me", "mi", "mis", "para", "por", "que", "se", "su", "sus",
  "un", "una", "uso", "y", "yo",
]);

const ALIAS: Record<string, string> = {
  llamo: "nombre", llama: "nombre", llamaba: "nombre", nombre: "nombre",
  creador: "creador", creo: "creador",
  trabajo: "ocupacion", profesion: "ocupacion", oficio: "ocupacion",
  dedico: "ocupacion", tecnico: "ocupacion",
  bici: "bicicleta", bicis: "bicicleta", bicicleta: "bicicleta",
  bicicletas: "bicicleta", madre: "mama", mama: "mama",
};

const PALABRAS_HISTORICAS = new Set([
  "antes", "anterior", "anteriormente", "pasado", "pasada", "era", "cambio",
  "cambiado", "cambiada", "historial",
]);

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .trim();
}

function obtenerPalabras(texto: string) {
  return normalizar(texto).split(/\s+/).filter(Boolean);
}

function obtenerTerminos(texto: string) {
  const terminos = new Set<string>();

  for (const palabra of obtenerPalabras(texto)) {
    const termino = ALIAS[palabra] ?? palabra;

    if (termino.length >= 3 && !PALABRAS_IGNORADAS.has(termino)) {
      terminos.add(termino);
    }
  }

  return [...terminos];
}

function necesitaHistorial(texto: string) {
  return obtenerPalabras(texto).some((palabra) =>
    PALABRAS_HISTORICAS.has(palabra),
  );
}

function calcularPuntaje(memoria: Memoria, terminos: string[]) {
  const tipo = normalizar(memoria.tipo);
  const entidad = normalizar(memoria.entidad ?? "");
  const clave = normalizar(memoria.clave);
  const valor = normalizar(memoria.valor);

  let puntaje = 0;

  for (const termino of terminos) {
    if (entidad.includes(termino)) {
      puntaje += 6;
    }

    if (clave.includes(termino)) {
      puntaje += 5;
    }

    if (tipo.includes(termino)) {
      puntaje += 2;
    }

    if (valor.includes(termino)) {
      puntaje += 1;
    }
  }

  return puntaje;
}

async function contarEntidades(db: D1Database, consulta: ConsultaEcho) {
  if (!consulta.entidad) {
    return null;
  }

  const tipo = consulta.tipo ? normalizar(consulta.tipo) : null;

  const entidad = normalizar(consulta.entidad);

  const resultado = await db
    .prepare(
      `
      SELECT COUNT(*) AS cantidad
      FROM entidades
      WHERE estado = 'activa'
        AND LOWER(nombre_base) = LOWER(?)
        AND (
          ? IS NULL
          OR LOWER(tipo) = LOWER(?)
        )
    `,
    )
    .bind(entidad, tipo, tipo)
    .first<{
      cantidad: number;
    }>();

  const cantidad = Number(resultado?.cantidad ?? 0);

  const ahora = new Date().toISOString();

  const memoriaCalculada: Memoria = {
    id: -1,
    tipo: consulta.tipo ?? "entidad",
    entidad: consulta.entidad,
    entidad_id: null,
    clave: "cantidad",
    valor: String(cantidad),
    confianza: 1,
    importancia: 10,
    fuente: "calculada",
    estado: "activa",
    reemplaza_id: null,
    creada_en: ahora,
    actualizada_en: ahora,
  };

  return memoriaCalculada;
}

export async function buscarMemoriasRelevantesConPuntaje(
  db: D1Database,
  pregunta: string,
  limite = 12,
): Promise<ResultadoBusquedaMemoria> {
  const incluirHistorial = necesitaHistorial(pregunta);

  const resultado = await db
    .prepare(
      incluirHistorial
        ? `
          SELECT *
          FROM memorias
          ORDER BY actualizada_en DESC
          LIMIT 500
        `
        : `
          SELECT *
          FROM memorias
          WHERE estado = 'activa'
          ORDER BY actualizada_en DESC
          LIMIT 500
        `,
    )
    .all<Memoria>();

  const terminos = obtenerTerminos(pregunta);

  if (terminos.length === 0) {
    return {
      memorias: [],
      puntajeMaximo: 0,
    };
  }

  const puntuadas = resultado.results
    .map((memoria) => ({
      memoria,
      puntaje: calcularPuntaje(memoria, terminos),
    }))
    .filter((resultado) => resultado.puntaje > 0)
    .sort((a, b) => {
      if (b.puntaje !== a.puntaje) {
        return b.puntaje - a.puntaje;
      }

      return b.memoria.importancia - a.memoria.importancia;
    });

  return {
    memorias: puntuadas.slice(0, limite).map((resultado) => resultado.memoria),
    puntajeMaximo: puntuadas[0]?.puntaje ?? 0,
  };
}

export async function buscarMemoriasRelevantes(
  db: D1Database,
  pregunta: string,
  limite = 12,
) {
  const resultado = await buscarMemoriasRelevantesConPuntaje(
    db,
    pregunta,
    limite,
  );

  return resultado.memorias;
}

export async function buscarMemoriasPorEcho(
  db: D1Database,
  consulta: ConsultaEcho,
  limite = 12,
) {
  if (normalizar(consulta.clave ?? "") === "cantidad") {
    const memoriaCalculada = await contarEntidades(db, consulta);

    return memoriaCalculada ? [memoriaCalculada] : [];
  }

  const resultado = await db
    .prepare(
      consulta.incluirHistorial
        ? `
          SELECT *
          FROM memorias
          ORDER BY actualizada_en DESC
          LIMIT 500
        `
        : `
          SELECT *
          FROM memorias
          WHERE estado = 'activa'
          ORDER BY actualizada_en DESC
          LIMIT 500
        `,
    )
    .all<Memoria>();

  const tipo = consulta.tipo ? normalizar(consulta.tipo) : null;

  const entidad = consulta.entidad ? normalizar(consulta.entidad) : null;

  const clave = consulta.clave ? normalizar(consulta.clave) : null;

  return resultado.results
    .filter((memoria) => {
      if (tipo && normalizar(memoria.tipo) !== tipo) {
        return false;
      }

      if (entidad && normalizar(memoria.entidad ?? "") !== entidad) {
        return false;
      }

      if (clave && normalizar(memoria.clave) !== clave) {
        return false;
      }

      return true;
    })
    .slice(0, limite);
}
