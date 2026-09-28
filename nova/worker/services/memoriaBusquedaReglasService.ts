import type { Memoria } from "./memoriaService.js";

const PALABRAS_IGNORADAS = new Set([
  "a",
  "al",
  "algo",
  "como",
  "cual",
  "cuando",
  "de",
  "del",
  "donde",
  "el",
  "ella",
  "en",
  "era",
  "es",
  "esta",
  "este",
  "fue",
  "la",
  "las",
  "lo",
  "los",
  "me",
  "mi",
  "mis",
  "para",
  "por",
  "que",
  "se",
  "su",
  "sus",
  "un",
  "una",
  "uso",
  "y",
  "yo",
]);

const ALIAS: Record<string, string> = {
  llamo: "nombre",
  llama: "nombre",
  llamaba: "nombre",
  nombre: "nombre",
  creador: "creador",
  creo: "creador",
  trabajo: "ocupacion",
  profesion: "ocupacion",
  oficio: "ocupacion",
  dedico: "ocupacion",
  tecnico: "ocupacion",
  bici: "bicicleta",
  bicis: "bicicleta",
  bicicleta: "bicicleta",
  bicicletas: "bicicleta",
  madre: "mama",
  mama: "mama",
};

const PALABRAS_HISTORICAS = new Set([
  "antes",
  "anterior",
  "anteriormente",
  "pasado",
  "pasada",
  "era",
  "cambio",
  "cambiado",
  "cambiada",
  "historial",
]);

export function normalizar(texto: string) {
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

export function obtenerTerminos(texto: string) {
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

function pideResumenCompleto(texto: string) {
  const contenido = ` ${normalizar(texto)} `;

  return (
    contenido.includes(" que recuerdas ") ||
    contenido.includes(" lo que recuerdas ") ||
    contenido.includes(" todo lo que recuerdas ") ||
    contenido.includes(" que sabes ") ||
    contenido.includes(" lo que sabes ") ||
    contenido.includes(" todo lo que sabes ")
  );
}

export function incluirMemoriaHistorica(texto: string) {
  return necesitaHistorial(texto) || pideResumenCompleto(texto);
}

export function calcularPuntaje(memoria: Memoria, terminos: string[]) {
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
