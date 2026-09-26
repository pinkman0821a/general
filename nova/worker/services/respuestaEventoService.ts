import type { EventoMemoria } from "./eventoMemoriaService.js";

function normalizar(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerArticulo(entidad: string) {
  const nombre = normalizar(entidad);

  if (
    nombre.endsWith("a") ||
    nombre.endsWith("cion") ||
    nombre.endsWith("dad")
  ) {
    return "la";
  }

  return "el";
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function crearRespuestaEvento(
  eventos: EventoMemoria[],
  mensajeUsuario: string,
) {
  if (
    mensajeUsuario.includes("?") ||
    mensajeUsuario.includes("¿")
  ) {
    return null;
  }

  if (eventos.length !== 1) {
    return null;
  }

  const evento = eventos[0];

  if (
    evento.accion !== "actualizada" ||
    !evento.valorAnterior
  ) {
    return null;
  }

  const articulo = obtenerArticulo(
    evento.entidad,
  );

  return `Listo. ${capitalizar(articulo)} ${evento.entidad} pasó de ${evento.valorAnterior} a ${evento.valorNuevo}.`;}

export function crearStreamRespuesta(
  texto: string,
) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            response: texto,
          })}\n\n`,
        ),
      );

      controller.enqueue(
        encoder.encode(
          "data: [DONE]\n\n",
        ),
      );

      controller.close();
    },
  });
}