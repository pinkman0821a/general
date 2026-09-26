import { responderConsultaHistorial } from "./consultaHistorialService.js";

type EntidadValor = {
  entidad_id: number;
  nombre_base: string;
  valor: string;
};

type ValorMemoria = {
  valor: string;
};

const ALIAS: Record<string, string> = {
  bicis: "bicicleta",
  bici: "bicicleta",
  bicicletas: "bicicleta",
  bicicleta: "bicicleta",
  carros: "carro",
  carro: "carro",
  motos: "moto",
  moto: "moto",
  mascotas: "mascota",
  mascota: "mascota",
};

const NUMEROS = [
  "cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete",
  "ocho", "nueve", "diez",
];

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

function numeroTexto(numero: number) {
  return NUMEROS[numero] ?? String(numero);
}

function pluralizar(nombre: string) {
  if (nombre.endsWith("s")) return nombre;
  return /[aeiou]$/.test(nombre) ? `${nombre}s` : `${nombre}es`;
}

function obtenerEntidadPregunta(texto: string) {
  for (const palabra of normalizar(texto).split(" ").reverse()) {
    if (ALIAS[palabra]) return ALIAS[palabra];
  }
  return null;
}

async function contarEntidades(db: D1Database, entidad: string) {
  const resultado = await db
    .prepare(`
      SELECT COUNT(*) AS cantidad
      FROM entidades
      WHERE estado = 'activa'
        AND LOWER(nombre_base) = LOWER(?)
    `)
    .bind(entidad)
    .first<{ cantidad: number }>();

  return Number(resultado?.cantidad ?? 0);
}

async function obtenerValoresActuales(
  db: D1Database,
  entidad: string,
  clave: string,
) {
  const resultado = await db
    .prepare(`
      SELECT e.id AS entidad_id, e.nombre_base, m.valor
      FROM entidades e
      INNER JOIN memorias m ON m.entidad_id = e.id
      WHERE e.estado = 'activa'
        AND m.estado = 'activa'
        AND LOWER(e.nombre_base) = LOWER(?)
        AND LOWER(m.clave) = LOWER(?)
      ORDER BY e.id ASC
    `)
    .bind(entidad, clave)
    .all<EntidadValor>();

  return resultado.results;
}

async function obtenerDatoPersonal(
  db: D1Database,
  tipo: string,
  entidad: string,
  clave: string,
) {
  return db
    .prepare(`
      SELECT m.valor
      FROM memorias m
      LEFT JOIN entidades e ON e.id = m.entidad_id
      WHERE m.estado = 'activa'
        AND LOWER(m.tipo) = LOWER(?)
        AND LOWER(m.clave) = LOWER(?)
        AND (
          LOWER(COALESCE(m.entidad, '')) = LOWER(?)
          OR LOWER(COALESCE(e.nombre_base, '')) = LOWER(?)
        )
      ORDER BY m.actualizada_en DESC
      LIMIT 1
    `)
    .bind(tipo, clave, entidad, entidad)
    .first<ValorMemoria>();
}

function unirValores(valores: string[]) {
  if (valores.length === 1) return valores[0];
  return `${valores.slice(0, -1).join(", ")} y ${valores.at(-1)}`;
}

async function responderDatoPersonal(db: D1Database, mensaje: string) {
  const texto = normalizar(mensaje);

  if (texto.includes("como me llamo") || texto.includes("cual es mi nombre")) {
    const memoria = await obtenerDatoPersonal(db, "persona", "Juan", "nombre");
    return memoria ? `Te llamas ${memoria.valor}.` : null;
  }

  if (
    texto.includes("a que me dedico") ||
    texto.includes("cual es mi trabajo") ||
    texto.includes("cual es mi profesion") ||
    texto.includes("en que trabajo")
  ) {
    const memoria = await obtenerDatoPersonal(db, "persona", "Juan", "ocupacion");
    return memoria ? `Eres ${memoria.valor}.` : null;
  }

  if (
    texto.includes("quien es tu creador") ||
    texto.includes("quien te creo") ||
    texto.includes("quien creo nova")
  ) {
    const memoria = await obtenerDatoPersonal(db, "proyecto", "NOVA", "creador");
    if (!memoria) return null;
    return normalizar(memoria.valor) === "juan"
      ? "Tú, Juan, eres mi creador."
      : `${memoria.valor} es mi creador.`;
  }

  return null;
}

async function responderCantidad(db: D1Database, mensaje: string) {
  const texto = normalizar(mensaje);
  if (!texto.startsWith("cuantas ") && !texto.startsWith("cuantos ")) return null;

  const entidad = obtenerEntidadPregunta(texto);
  if (!entidad) return null;

  const cantidad = await contarEntidades(db, entidad);
  if (cantidad === 0) return null;

  return `Tienes ${numeroTexto(cantidad)} ${pluralizar(entidad)}.`;
}

async function responderColor(db: D1Database, mensaje: string) {
  const texto = normalizar(mensaje);
  if (!texto.includes("color") || (!texto.includes("mis ") && !texto.includes("mi "))) {
    return null;
  }

  const entidad = obtenerEntidadPregunta(texto);
  if (!entidad) return null;

  const cantidad = await contarEntidades(db, entidad);
  const memorias = await obtenerValoresActuales(db, entidad, "color");

  if (cantidad === 0 || memorias.length !== cantidad) return null;

  const colores = memorias.map((memoria) => memoria.valor);

  if (cantidad === 1) return `Tu ${entidad} es ${colores[0]}.`;
  if (cantidad === 2) {
    return `Tienes dos ${pluralizar(entidad)}: una ${colores[0]} y otra ${colores[1]}.`;
  }

  return `Tienes ${numeroTexto(cantidad)} ${pluralizar(entidad)}. Sus colores actuales son ${unirValores(colores)}.`;
}

export async function responderConsultaDirecta(db: D1Database, mensaje: string) {
  if (!mensaje.includes("?") && !mensaje.includes("¿")) return null;

  return (
    (await responderConsultaHistorial(db, mensaje)) ??
    (await responderDatoPersonal(db, mensaje)) ??
    (await responderCantidad(db, mensaje)) ??
    (await responderColor(db, mensaje))
  );
}
