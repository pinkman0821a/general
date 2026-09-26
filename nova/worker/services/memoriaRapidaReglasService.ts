import type { MemoriaExtraida } from "./memoriaExtractor.js";

const COLORES = [
  "amarilla",
  "amarillo",
  "plateada",
  "plateado",
  "morada",
  "morado",
  "purpura",
  "violeta",
  "rosada",
  "rosado",
  "blanca",
  "blanco",
  "negra",
  "negro",
  "verde",
  "roja",
  "rojo",
  "azul",
  "gris",
  "cafe",
  "marron",
  "rosa",
  "naranja",
  "beige",
  "dorada",
  "dorado",
];

const TIPOS_MASCOTA = new Set([
  "mascota",
  "perro",
  "perra",
  "gato",
  "gata",
  "conejo",
  "coneja",
  "hamster",
  "loro",
  "lora",
  "ave",
  "pajaro",
  "pez",
  "tortuga",
]);

const MENSAJES_IGNORABLES = new Set([
  "hola",
  "hola nova",
  "buenas",
  "buenos dias",
  "buenas tardes",
  "buenas noches",
  "gracias",
  "muchas gracias",
  "ok",
  "okay",
  "listo",
  "vale",
  "ya",
  "jaja",
  "jajaja",
  "jeje",
  "jsjs",
  "jsjsjs",
]);

const PREFIJOS_INCIERTOS = [
  "creo que",
  "pienso que",
  "me parece que",
  "tal vez",
  "quiza",
  "quizas",
  "posiblemente",
  "probablemente",
  "puede que",
  "podria ser que",
  "no estoy seguro",
  "no estoy segura",
  "no se si",
];

const PREFIJOS_IMAGINADOS = [
  "sone que",
  "imagine que",
  "imagino que",
  "supongamos que",
  "imaginemos que",
];

const PREFIJOS_ATRIBUIDOS = [
  "segun",
  "dicen que",
  "me dijeron que",
  "alguien me dijo que",
  "lei que",
  "escuche que",
];

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

export function quitarPrefijoRecuerdo(texto: string) {
  return texto
    .trim()
    .replace(
      /^(?:recuerda\s+que|recuerda|quiero\s+que\s+recuerdes\s+que)\s+/iu,
      "",
    )
    .replace(/[.!?]+$/g, "")
    .trim();
}

function empiezaConAlguno(
  texto: string,
  prefijos: string[],
) {
  return prefijos.some(
    (prefijo) =>
      texto === prefijo ||
      texto.startsWith(`${prefijo} `),
  );
}

export function bloqueaMemoriaRapida(
  texto: string,
) {
  const normalizado = normalizar(texto);
  const contenido = normalizar(
    quitarPrefijoRecuerdo(texto),
  );

  if (
    /^(?:no recuerdes|olvida|olvidate de)\b/.test(
      normalizado,
    )
  ) {
    return true;
  }

  if (
    /\bno\s+se\s+llama\b/.test(contenido) ||
    /\bsu\s+color\s+no\s+(?:es|esta)\b/.test(
      contenido,
    )
  ) {
    return true;
  }

  if (
    empiezaConAlguno(
      contenido,
      PREFIJOS_INCIERTOS,
    ) ||
    empiezaConAlguno(
      contenido,
      PREFIJOS_IMAGINADOS,
    ) ||
    empiezaConAlguno(
      contenido,
      PREFIJOS_ATRIBUIDOS,
    )
  ) {
    return true;
  }

  return /^[\p{L}][\p{L}' -]{0,60}\s+(?:dice|dijo|afirma|asegura|comenta|cree)\s+que\b/u.test(
    contenido,
  );
}

export function esMensajeIgnorable(
  mensaje: string,
) {
  return MENSAJES_IGNORABLES.has(
    normalizar(mensaje),
  );
}

function escaparRegex(texto: string) {
  return texto.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

export function regexColores() {
  return COLORES.map(escaparRegex).join("|");
}

export function crearMemoria(
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

export function crearMemoriaColor(
  entidad: string,
  referencia: string | null,
  valor: string,
) {
  return crearMemoria(
    "objeto",
    entidad.trim(),
    "color",
    valor,
    6,
    referencia,
  );
}

export function inferirTipoEntidad(
  entidad: string,
) {
  const palabras = normalizar(
    entidad,
  ).split(/\s+/);

  return palabras.some(
    (palabra) => TIPOS_MASCOTA.has(palabra),
  )
    ? "mascota"
    : "objeto";
}
