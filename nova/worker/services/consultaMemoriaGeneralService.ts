function normalizar(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tieneIntencionDeMemoria(texto: string) {
  return /\b(?:recuerd\w*|sabes|conoces|guardad\w*|informacion|datos)\b/.test(
    texto,
  );
}

function hablaDeSiMismoEnGeneral(texto: string) {
  return (
    /(?:^|\s)(?:de|sobre|acerca de) mi$/.test(texto) ||
    /(?:^|\s)(?:datos|informacion|recuerdos|cosas) (?:mios|mias)$/.test(texto)
  );
}

export function esConsultaGeneralMemoria(texto: string) {
  const normalizado = normalizar(texto);

  if (!normalizado) {
    return false;
  }

  return (
    tieneIntencionDeMemoria(normalizado) &&
    hablaDeSiMismoEnGeneral(normalizado)
  );
}