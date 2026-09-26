import type { EventoMemoria } from "./eventoMemoriaService.js";
import type { Memoria } from "./memoriaService.js";
import {
  crearRespuestaEvento,
  crearStreamRespuesta,
} from "./respuestaEventoService.js";
import { contabilizarStream } from "./streamUsoService.js";
import { registrarUsoIA } from "./usoIaService.js";
import {
  limpiarRespuestaConversacionCasual,
  pareceConversacionCasual,
} from "./aiConversacionService.js";
import {
  obtenerUltimoUsuario,
  prepararMensajes,
  type ContextoSistema,
  type MensajeConversacion,
} from "./aiMensajesService.js";

export type { ContextoSistema, MensajeConversacion };

const MODELO_NOVA = "@cf/meta/llama-3.1-8b-instruct-fp8";

export async function generarRespuestaNova(
  ai: Ai,
  mensajes: MensajeConversacion[],
  contextoSistema: ContextoSistema,
  memoriasActivas: Memoria[],
  historialMemorias: Memoria[],
  eventosMemoria: EventoMemoria[] = [],
  db?: D1Database,
) {
  const ultimoMensajeUsuario = obtenerUltimoUsuario(mensajes);

  const respuestaDirecta = crearRespuestaEvento(
    eventosMemoria,
    ultimoMensajeUsuario,
  );

  if (respuestaDirecta) {
    return respuestaDirecta;
  }

  const respuesta = await ai.run(MODELO_NOVA, {
    messages: prepararMensajes(
      mensajes,
      contextoSistema,
      memoriasActivas,
      historialMemorias,
      eventosMemoria,
    ),
  });

  if (db && respuesta.usage) {
    await registrarUsoIA(db, respuesta.usage);
  }

  const contenido = respuesta.response;

  if (typeof contenido !== "string" || contenido.trim() === "") {
    throw new Error("La IA no devolvió una respuesta de texto");
  }

  return pareceConversacionCasual(ultimoMensajeUsuario)
    ? limpiarRespuestaConversacionCasual(contenido)
    : contenido;
}

export async function generarRespuestaNovaStream(
  ai: Ai,
  mensajes: MensajeConversacion[],
  contextoSistema: ContextoSistema,
  memoriasActivas: Memoria[],
  historialMemorias: Memoria[],
  eventosMemoria: EventoMemoria[] = [],
  db?: D1Database,
) {
  const ultimoMensajeUsuario = obtenerUltimoUsuario(mensajes);

  const respuestaDirecta = crearRespuestaEvento(
    eventosMemoria,
    ultimoMensajeUsuario,
  );

  if (respuestaDirecta) {
    return crearStreamRespuesta(respuestaDirecta);
  }

  if (pareceConversacionCasual(ultimoMensajeUsuario)) {
    const respuesta = await generarRespuestaNova(
      ai,
      mensajes,
      contextoSistema,
      memoriasActivas,
      historialMemorias,
      eventosMemoria,
      db,
    );

    return crearStreamRespuesta(respuesta);
  }

  const stream = await ai.run(MODELO_NOVA, {
    messages: prepararMensajes(
      mensajes,
      contextoSistema,
      memoriasActivas,
      historialMemorias,
      eventosMemoria,
    ),
    stream: true,
  });

  if (!db) {
    return stream;
  }

  return contabilizarStream(
    stream as ReadableStream<Uint8Array>,
    db,
  );
}