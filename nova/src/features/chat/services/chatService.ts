import type { Mensaje } from "../types/Mensaje";

type RespuestaChat = {
  mensaje: string;
};

function obtenerContextoSistema() {
  const ahora = new Date();
  const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    fechaHoraLocal: new Intl.DateTimeFormat("es-CO", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: zonaHoraria,
    }).format(ahora),
    fechaHoraUtc: ahora.toISOString(),
    zonaHoraria,
  };
}

export async function enviarMensajeAlServidor(mensajes: Mensaje[]) {
  const respuesta = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mensajes: mensajes.slice(-20),
      contextoSistema: obtenerContextoSistema(),
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`Error del servidor: ${respuesta.status}`);
  }

  const datos: RespuestaChat = await respuesta.json();

  return datos.mensaje;
}

export async function enviarMensajeAlServidorStream(
  mensajes: Mensaje[],
  onFragmento: (fragmento: string) => void,
) {
  const tiempoInicio = performance.now();

  const respuesta = await fetch("/api/chat-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mensajes: mensajes.slice(-20),
      contextoSistema: obtenerContextoSistema(),
    }),
  });

  const tiempoServidor = performance.now();

  console.log(
    `[NOVA] Servidor respondió en: ${(
      (tiempoServidor - tiempoInicio) /
      1000
    ).toFixed(2)} segundos`,
  );

  if (!respuesta.ok) {
    throw new Error(`Error del servidor: ${respuesta.status}`);
  }

  if (!respuesta.body) {
    throw new Error("El servidor no devolvió un stream");
  }

  const lector = respuesta.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let primerFragmentoRecibido = false;

  while (true) {
    const { done, value } = await lector.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lineas = buffer.split("\n");
    buffer = lineas.pop() ?? "";

    for (const linea of lineas) {
      const lineaLimpia = linea.trim();

      if (!lineaLimpia.startsWith("data: ")) continue;

      const dato = lineaLimpia.slice(6);

      if (dato === "[DONE]") {
        const tiempoFinal = performance.now();

        console.log(
          `[NOVA] Respuesta completa en: ${(
            (tiempoFinal - tiempoInicio) /
            1000
          ).toFixed(2)} segundos`,
        );

        return;
      }

      const evento = JSON.parse(dato);
      const contenido = evento.response;

      if (typeof contenido !== "string" || contenido === "") {
        continue;
      }

      if (!primerFragmentoRecibido) {
        primerFragmentoRecibido = true;

        const tiempoPrimerFragmento = performance.now();

        console.log(
          `[NOVA] Primera palabra visible en: ${(
            (tiempoPrimerFragmento - tiempoInicio) /
            1000
          ).toFixed(2)} segundos`,
        );
      }

      onFragmento(contenido);
    }
  }
}
