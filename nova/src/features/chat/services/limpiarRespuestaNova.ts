const REEMPLAZOS = [
  /\bsegún mis recuerdos\s*[:,]?\s*/gi,
  /\bsegún mi memoria\s*[:,]?\s*/gi,
  /\bsegún mi base de datos\s*[:,]?\s*/gi,
  /\btengo registrado que\s+/gi,
  /\ben tus recuerdos\b/gi,
];

function capitalizarInicio(texto: string) {
  if (!texto) {
    return texto;
  }

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
  );
}

export function limpiarRespuestaNova(
  texto: string,
) {
  let resultado = texto;

  for (const patron of REEMPLAZOS) {
    resultado = resultado.replace(
      patron,
      "",
    );
  }

  resultado = resultado
    .replace(/\s+([,.:;!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trimStart();

  return capitalizarInicio(resultado);
}