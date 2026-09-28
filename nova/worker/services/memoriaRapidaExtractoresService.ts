import type { MemoriaExtraida } from "./memoriaExtractor.js";
import {
  crearMemoria,
  crearMemoriaColor,
  inferirTipoEntidad,
  normalizar,
  quitarPrefijoRecuerdo,
  regexColores,
} from "./memoriaRapidaReglasService.js";

function extraerNombreYColorEntidad(mensaje: string) {
  const texto = quitarPrefijoRecuerdo(mensaje);

  const resultado = texto.match(
    /^mi\s+(.+?)\s+se\s+llama\s+(.+?)\s*,?\s+y\s+su\s+color\s+(?:es|está|esta)\s+([\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*)?)\s*[.!?]?$/iu,
  );

  if (!resultado) {
    return [];
  }

  const entidad = normalizar(resultado[1]);

  const nombre = resultado[2].trim();

  const color = normalizar(resultado[3]);

  const tipo = inferirTipoEntidad(entidad);

  return [
    crearMemoria(tipo, entidad, "nombre", nombre, 8),
    crearMemoria(tipo, entidad, "color", color, 6),
  ];
}

function extraerDatosPersonales(mensaje: string) {
  const memorias: MemoriaExtraida[] = [];

  const nombre = mensaje
    .match(
      /(?:^|[,.!?]\s*|\b)me\s+llamo\s+([\p{L}][\p{L}' -]{1,60}?)(?=\s+y\s+soy\b|[,.!?]|$)/iu,
    )?.[1]
    ?.trim();

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
    mensaje.match(/\b(?:yo\s+)?soy\s+(técnico(?:\s+de\s+[^,.!?]+)?)/iu)?.[1] ??
    mensaje.match(/\btrabajo\s+como\s+([^,.!?]+)/iu)?.[1] ??
    mensaje.match(/\bme\s+dedico\s+a\s+([^,.!?]+)/iu)?.[1];

  if (profesion) {
    memorias.push(
      crearMemoria("persona", "Juan", "ocupacion", profesion.trim(), 9),
    );
  }

  return memorias;
}

function extraerCambioColorAhoraInicial(mensaje: string) {
  const texto = normalizar(mensaje);

  const colores = regexColores();

  const resultado = texto.match(
    new RegExp(
      `^ahora\\s+(?:mi|el|la)\\s+(.+?)\\s+(?:es|esta)\\s+(${colores})$`,
    ),
  );

  return resultado ? crearMemoriaColor(resultado[1], null, resultado[2]) : null;
}

function extraerCambioColorConReferencia(mensaje: string) {
  const texto = normalizar(mensaje);

  const colores = regexColores();

  const resultado = texto.match(
    new RegExp(
      `^(?:mi|el|la)\\s+(.+?)\\s+(${colores})\\s+ahora\\s+(?:es|esta)\\s+(${colores})$`,
    ),
  );

  return resultado
    ? crearMemoriaColor(resultado[1], resultado[2], resultado[3])
    : null;
}

function extraerCambioColorSinReferencia(mensaje: string) {
  const texto = normalizar(mensaje);

  const colores = regexColores();

  const resultado = texto.match(
    new RegExp(
      `^(?:mi|el|la)\\s+(.+?)\\s+ahora\\s+(?:es|esta)\\s+(${colores})$`,
    ),
  );

  return resultado ? crearMemoriaColor(resultado[1], null, resultado[2]) : null;
}

function extraerEntidadNuevaColor(mensaje: string) {
  const texto = normalizar(mensaje);

  const colores = regexColores();

  const resultado = texto.match(
    new RegExp(
      `^tengo\\s+(?:otra|otro|una nueva|un nuevo)\\s+(.+?)\\s+(${colores})$`,
    ),
  );

  return resultado ? crearMemoriaColor(resultado[1], null, resultado[2]) : null;
}

function extraerColorSimple(mensaje: string) {
  const texto = normalizar(mensaje);

  const colores = regexColores();

  const resultado = texto.match(
    new RegExp(`^(?:mi|el|la)\\s+(.+?)\\s+(?:es|esta)\\s+(${colores})$`),
  );

  if (!resultado) {
    return null;
  }

  const entidad = resultado[1].trim();

  if (entidad.endsWith(" ahora")) {
    return null;
  }

  return crearMemoriaColor(entidad, null, resultado[2]);
}

export function extraerMemoriasDeterministas(mensaje: string) {
  const nombreYColor = extraerNombreYColorEntidad(mensaje);

  if (nombreYColor.length > 0) {
    return nombreYColor;
  }

  const personales = extraerDatosPersonales(mensaje);

  if (personales.length > 0) {
    return personales;
  }

  const memoria =
    extraerCambioColorAhoraInicial(mensaje) ??
    extraerCambioColorConReferencia(mensaje) ??
    extraerCambioColorSinReferencia(mensaje) ??
    extraerEntidadNuevaColor(mensaje) ??
    extraerColorSimple(mensaje);

  return memoria ? [memoria] : [];
}
