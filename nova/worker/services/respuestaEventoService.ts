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

function describirEvento(evento: EventoMemoria) {
  if (evento.accion === "creada") {
    return `${evento.entidad}: ${evento.clave} = ${evento.valorNuevo}`;
  }

  if (
    evento.accion === "actualizada" &&
    evento.valorAnterior
  ) {
    return `${evento.entidad}: ${evento.clave} pasó de ${evento.valorAnterior} a ${evento.valorNuevo}`;
  }

  return null;
}

function crearRespuestaMultiple(eventos: EventoMemoria[]) {
  const eventosUtiles = eventos.filter(
    (evento) =>
      evento.accion === "creada" ||
      evento.accion === "actualizada",
  );

  if (eventosUtiles.length < 2) {
    return null;
  }

  const descripciones = eventosUtiles
    .map(describirEvento)
    .filter((descripcion): descripcion is string => Boolean(descripcion));

  if (descripciones.length < 2) {
    return null;
  }

  const todosCreados = eventosUtiles.every(
    (evento) => evento.accion === "creada",
  );

  const todosActualizados = eventosUtiles.every(
    (evento) => evento.accion === "actualizada",
  );

  if (todosCreados) {
    return `Listo. Guardé estos datos: ${descripciones.join("; ")}.`;
  }

  if (todosActualizados) {
    return `Listo. Actualicé estos datos: ${descripciones.join("; ")}.`;
  }

  return `Listo. Registré estos cambios: ${descripciones.join("; ")}.`;
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

  const respuestaMultiple = crearRespuestaMultiple(eventos);

  if (respuestaMultiple) {
    return respuestaMultiple;
  }

  if (eventos.length !== 1) {
    return null;
  }

  const evento = eventos[0];

  if (evento.accion === "creada") {
    return `Listo. Ya guardé ese dato: ${evento.valorNuevo}.`;
  }

  if (
    evento.accion !== "actualizada" ||
    !evento.valorAnterior
  ) {
    return null;
  }

  const articulo = obtenerArticulo(
    evento.entidad,
  );

  return `Listo. ${capitalizar(articulo)} ${evento.entidad} pasó de ${evento.valorAnterior} a ${evento.valorNuevo}.`;
}

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