import type { MemoriaExtraida } from "./memoriaExtractor.js";

export type ResultadoMemoriaRapida = {
  memorias: MemoriaExtraida[];
  usarIA: boolean;
};

const COLORES = [
  "amarilla", "amarillo", "plateada", "plateado", "morada", "morado",
  "purpura", "violeta", "rosada", "rosado", "blanca", "blanco", "negra",
  "negro", "verde", "roja", "rojo", "azul", "gris", "cafe", "marron",
  "rosa", "naranja", "beige", "dorada", "dorado",
];

const MENSAJES_IGNORABLES = new Set([
  "hola", "hola nova", "buenas", "buenos dias", "buenas tardes",
  "buenas noches", "gracias", "muchas gracias", "ok", "okay", "listo",
  "vale", "ya", "jaja", "jajaja", "jeje", "jsjs", "jsjsjs",
]);

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

function escaparRegex(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function regexColores() {
  return COLORES.map(escaparRegex).join("|");
}

function crearMemoria(
  tipo: string,
  entidad: string,
  clave: string,
  valor: string,
  importancia: number,
  referencia: string | null = null,
): MemoriaExtraida {
  return {
    tipo,
    entidad,
    referencia,
    clave,
    valor: valor.trim(),
    confianza: 1,
    importancia,
  };
}

function crearMemoriaColor(entidad: string, referencia: string | null, valor: string) {
  return crearMemoria("objeto", entidad.trim(), "color", valor, 6, referencia);
}

function extraerDatosPersonales(mensaje: string) {
  const memorias: MemoriaExtraida[] = [];
  const nombre = mensaje.match(
    /(?:^|[,.!?]\s*|\b)me\s+llamo\s+([\p{L}][\p{L}' -]{1,60}?)(?=\s+y\s+soy\b|[,.!?]|$)/iu,
  )?.[1]?.trim();

  if (nombre) {
    memorias.push(crearMemoria("persona", "Juan", "nombre", nombre, 10));
  }

  const texto = normalizar(mensaje);
  const afirmaCreador =
    texto.includes("soy tu creador") ||
    texto.includes("soy el creador de nova") ||
    texto.includes("yo cree nova") ||
    texto.includes("yo cree a nova");

  if (afirmaCreador) {
    memorias.push(
      crearMemoria("proyecto", "NOVA", "creador", nombre || "Juan", 10),
    );
  }

  const profesion =
    mensaje.match(/\b(?:yo\s+)?soy\s+(t[eé]cnico(?:\s+de\s+[^,.!?]+)?)/iu)?.[1] ??
    mensaje.match(/\btrabajo\s+como\s+([^,.!?]+)/iu)?.[1] ??
    mensaje.match(/\bme\s+dedico\s+a\s+([^,.!?]+)/iu)?.[1];

  if (profesion) {
    memorias.push(
      crearMemoria("persona", "Juan", "ocupacion", profesion.trim(), 9),
    );
  }

  return memorias;
}

function extraerCambioColorConReferencia(mensaje: string) {
  const texto = normalizar(mensaje);
  const colores = regexColores();
  const resultado = texto.match(
    new RegExp(`^(?:mi|el|la)\\s+(.+?)\\s+(${colores})\\s+ahora\\s+(?:es|esta)\\s+(${colores})$`),
  );
  return resultado ? crearMemoriaColor(resultado[1], resultado[2], resultado[3]) : null;
}

function extraerCambioColorSinReferencia(mensaje: string) {
  const texto = normalizar(mensaje);
  const colores = regexColores();
  const resultado = texto.match(
    new RegExp(`^(?:mi|el|la)\\s+(.+?)\\s+ahora\\s+(?:es|esta)\\s+(${colores})$`),
  );
  return resultado ? crearMemoriaColor(resultado[1], null, resultado[2]) : null;
}

function extraerEntidadNuevaColor(mensaje: string) {
  const texto = normalizar(mensaje);
  const colores = regexColores();
  const resultado = texto.match(
    new RegExp(`^tengo\\s+(?:otra|otro|una nueva|un nuevo)\\s+(.+?)\\s+(${colores})$`),
  );
  return resultado ? crearMemoriaColor(resultado[1], null, resultado[2]) : null;
}

function extraerColorSimple(mensaje: string) {
  const texto = normalizar(mensaje);
  const colores = regexColores();
  const resultado = texto.match(
    new RegExp(`^(?:mi|el|la)\\s+(.+?)\\s+(?:es|esta)\\s+(${colores})$`),
  );

  if (!resultado) return null;

  const entidad = resultado[1].trim();
  if (entidad.endsWith(" ahora")) return null;

  return crearMemoriaColor(entidad, null, resultado[2]);
}

export function analizarMemoriaRapida(mensaje: string): ResultadoMemoriaRapida {
  if (MENSAJES_IGNORABLES.has(normalizar(mensaje)) || mensaje.includes("?") || mensaje.includes("¿")) {
    return { memorias: [], usarIA: false };
  }

  const personales = extraerDatosPersonales(mensaje);
  if (personales.length > 0) {
    return { memorias: personales, usarIA: false };
  }

  const memoria =
    extraerCambioColorConReferencia(mensaje) ??
    extraerCambioColorSinReferencia(mensaje) ??
    extraerEntidadNuevaColor(mensaje) ??
    extraerColorSimple(mensaje);

  if (memoria) {
    return { memorias: [memoria], usarIA: false };
  }

  return { memorias: [], usarIA: true };
}
