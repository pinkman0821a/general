import type { MensajeConversacion } from "./aiService.js";

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

function esConsultaHistorica(texto: string) {
  const normalizado = normalizar(texto);

  if (normalizado.includes("historial")) {
    return true;
  }

  const hablaDeColor =
    normalizado.includes("color") ||
    normalizado.includes("colores");

  const hablaDelPasado =
    normalizado.includes("antes") ||
    normalizado.includes("anterior") ||
    normalizado.includes("anteriores") ||
    normalizado.includes("ha tenido") ||
    normalizado.includes("han tenido") ||
    normalizado.includes("era ");

  return hablaDeColor && hablaDelPasado;
}

function esPreguntaDeAclaracion(texto: string) {
  const normalizado = normalizar(texto);

  return (
    normalizado.includes("a cual") &&
    normalizado.includes("te refieres")
  );
}

function esRespuestaBreve(texto: string) {
  if (
    texto.includes("?") ||
    texto.includes("¿")
  ) {
    return false;
  }

  const palabras = normalizar(texto)
    .split(" ")
    .filter(Boolean);

  return (
    palabras.length >= 1 &&
    palabras.length <= 8
  );
}

function esSeguimientoHistorico(texto: string) {
  const normalizado = normalizar(texto);

  return (
    normalizado.startsWith("y antes de ") ||
    normalizado.startsWith("antes de ") ||
    normalizado.includes(" antes de ")
  );
}

export function resolverConsultaPendiente(
  mensajes: MensajeConversacion[],
) {
  if (mensajes.length < 3) {
    return null;
  }

  const ultimos = mensajes.slice(-3);

  const preguntaAnterior = ultimos[0];
  const respuestaNova = ultimos[1];
  const respuestaUsuario = ultimos[2];

  if (
    preguntaAnterior.autor !== "usuario" ||
    respuestaNova.autor !== "nova" ||
    respuestaUsuario.autor !== "usuario"
  ) {
    return null;
  }

  if (
    esConsultaHistorica(
      preguntaAnterior.texto,
    ) &&
    esPreguntaDeAclaracion(
      respuestaNova.texto,
    ) &&
    esRespuestaBreve(
      respuestaUsuario.texto,
    )
  ) {
    return `${preguntaAnterior.texto} ${respuestaUsuario.texto}`;
  }

  if (
    esConsultaHistorica(
      preguntaAnterior.texto,
    ) &&
    esSeguimientoHistorico(
      respuestaUsuario.texto,
    )
  ) {
    return `${preguntaAnterior.texto} ${respuestaUsuario.texto}`;
  }

  return null;
}