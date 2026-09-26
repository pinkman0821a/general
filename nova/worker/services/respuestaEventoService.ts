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

function describirEstadoActual(evento: EventoMemoria) {
  return `${evento.entidad}: ${evento.clave} = ${evento.valorNuevo}`;
}

function describirCambio(evento: EventoMemoria) {
  if (evento.accion === "creada") {
    return describirEstadoActual(evento);
  }

  if (evento.accion === "actualizada" && evento.valorAnterior) {
    return `${evento.entidad}: ${evento.clave} pasó de ${evento.valorAnterior} a ${evento.valorNuevo}`;
  }

  return describirEstadoActual(evento);
}

function crearTextoDatosExistentes(eventos: EventoMemoria[]) {
  const descripciones = eventos.map(describirEstadoActual);

  if (descripciones.length === 1) {
    return `Sí, ese dato ya lo tenía guardado: ${descripciones[0]}.`;
  }

  return `Sí, esos datos ya los tenía guardados: ${descripciones.join("; ")}.`;
}

function crearRespuestaSinCambios(eventos: EventoMemoria[]) {
  if (
    eventos.length === 0 ||
    !eventos.every((evento) => evento.accion === "sin_cambio")
  ) {
    return null;
  }

  return crearTextoDatosExistentes(eventos);
}

function crearRespuestaMultiple(eventos: EventoMemoria[]) {
  if (eventos.length < 2) {
    return null;
  }

  const eventosConCambio = eventos.filter(
    (evento) => evento.accion === "creada" || evento.accion === "actualizada",
  );

  const eventosSinCambio = eventos.filter(
    (evento) => evento.accion === "sin_cambio",
  );

  if (eventosConCambio.length === 0) {
    return null;
  }

  const descripcionesCambio = eventosConCambio.map(describirCambio);

  let respuesta: string;

  if (eventosConCambio.length === 1) {
    respuesta = `Listo. Registré este cambio: ${descripcionesCambio[0]}.`;
  } else {
    const todosCreados = eventosConCambio.every(
      (evento) => evento.accion === "creada",
    );

    const todosActualizados = eventosConCambio.every(
      (evento) => evento.accion === "actualizada",
    );

    if (todosCreados) {
      respuesta = `Listo. Guardé estos datos: ${descripcionesCambio.join("; ")}.`;
    } else if (todosActualizados) {
      respuesta = `Listo. Actualicé estos datos: ${descripcionesCambio.join("; ")}.`;
    } else {
      respuesta = `Listo. Registré estos cambios: ${descripcionesCambio.join("; ")}.`;
    }
  }

  if (eventosSinCambio.length === 0) {
    return respuesta;
  }

  const datosExistentes = eventosSinCambio.map(describirEstadoActual);

  if (datosExistentes.length === 1) {
    return `${respuesta} Ya tenía guardado este dato: ${datosExistentes[0]}.`;
  }

  return `${respuesta} Ya tenía guardados estos datos: ${datosExistentes.join("; ")}.`;
}

export function crearRespuestaEvento(
  eventos: EventoMemoria[],
  mensajeUsuario: string,
) {
  if (mensajeUsuario.includes("?") || mensajeUsuario.includes("¿")) {
    return null;
  }

  if (eventos.length === 0) {
    return null;
  }

  const respuestaSinCambios = crearRespuestaSinCambios(eventos);

  if (respuestaSinCambios) {
    return respuestaSinCambios;
  }

  const respuestaMultiple = crearRespuestaMultiple(eventos);

  if (respuestaMultiple) {
    return respuestaMultiple;
  }

  if (eventos.length !== 1) {
    return null;
  }

  const evento = eventos[0];

  if (evento.accion === "sin_cambio") {
    return crearTextoDatosExistentes(eventos);
  }

  if (evento.accion === "creada") {
    return `Listo. Ya guardé ese dato: ${evento.valorNuevo}.`;
  }

  if (evento.accion !== "actualizada" || !evento.valorAnterior) {
    return null;
  }

  const articulo = obtenerArticulo(evento.entidad);

  return `Listo. ${capitalizar(articulo)} ${evento.entidad} pasó de ${evento.valorAnterior} a ${evento.valorNuevo}.`;
}

export function crearStreamRespuesta(texto: string) {
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

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));

      controller.close();
    },
  });
}
