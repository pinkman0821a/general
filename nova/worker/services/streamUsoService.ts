import {
  registrarUsoIA,
  type UsoTokens,
} from "./usoIaService.js";

function obtenerUsoEvento(
  linea: string,
) {
  const limpia = linea.trim();

  if (!limpia.startsWith("data:")) {
    return null;
  }

  const contenido =
    limpia.slice(5).trim();

  if (
    !contenido ||
    contenido === "[DONE]"
  ) {
    return null;
  }

  try {
    const evento =
      JSON.parse(contenido);

    if (
      evento.usage &&
      typeof evento.usage === "object"
    ) {
      return evento.usage as UsoTokens;
    }
  } catch {
    return null;
  }

  return null;
}

export function contabilizarStream(
  stream: ReadableStream<Uint8Array>,
  db: D1Database,
) {
  const decoder =
    new TextDecoder();

  let buffer = "";
  let ultimoUso: UsoTokens | null =
    null;

  return stream.pipeThrough(
    new TransformStream<
      Uint8Array,
      Uint8Array
    >({
      transform(
        chunk,
        controller,
      ) {
        controller.enqueue(chunk);

        buffer += decoder.decode(
          chunk,
          {
            stream: true,
          },
        );

        const lineas =
          buffer.split("\n");

        buffer =
          lineas.pop() ?? "";

        for (const linea of lineas) {
          const uso =
            obtenerUsoEvento(linea);

          if (uso) {
            ultimoUso = uso;
          }
        }
      },

      async flush() {
        buffer += decoder.decode();

        if (buffer.trim()) {
          const uso =
            obtenerUsoEvento(buffer);

          if (uso) {
            ultimoUso = uso;
          }
        }

        if (ultimoUso) {
          await registrarUsoIA(
            db,
            ultimoUso,
          );
        }
      },
    }),
  );
}