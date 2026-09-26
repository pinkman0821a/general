import {
  generarRespuestaNova,
  generarRespuestaNovaStream,
  type ContextoSistema,
  type MensajeConversacion,
} from "./aiService.js";
import { esConsultaGeneralMemoria } from "./consultaMemoriaGeneralService.js";
import { consultarEcho } from "./echoService.js";
import type { EventoMemoria } from "./eventoMemoriaService.js";
import { procesarMemoriaAutomatica } from "./memoriaAutomaticaService.js";
import {
  buscarMemoriasPorEcho,
  buscarMemoriasRelevantesConPuntaje,
} from "./memoriaBusquedaService.js";
import { obtenerMemoriasActivas, type Memoria } from "./memoriaService.js";
import { resolverAclaracionPendiente } from "./resolverAclaracionService.js";
import { responderDirectamente } from "./respuestaDirectaChatService.js";
import {
  crearRespuestaEvento,
  crearStreamRespuesta,
} from "./respuestaEventoService.js";

export type DatosChat = {
  mensajes: MensajeConversacion[];
  contextoSistema: ContextoSistema;
};

const UMBRAL_BUSQUEDA_DIRECTA = 5;
const LIMITE_MEMORIA_GENERAL = 20;

function obtenerUltimoUsuario(mensajes: MensajeConversacion[]) {
  return [...mensajes].reverse().find((mensaje) => mensaje.autor === "usuario");
}

function crearConsultaMemoria(mensajes: MensajeConversacion[]) {
  return mensajes
    .filter((mensaje) => mensaje.autor === "usuario")
    .slice(-4)
    .map((mensaje) => mensaje.texto)
    .join(" ");
}

function separarMemorias(memorias: Memoria[]) {
  return {
    memoriasActivas: memorias.filter((memoria) => memoria.estado === "activa"),
    historialMemorias: memorias.filter(
      (memoria) => memoria.estado !== "activa",
    ),
  };
}

async function obtenerMemorias(
  ai: Ai,
  db: D1Database,
  mensajes: MensajeConversacion[],
) {
  const ultimo = obtenerUltimoUsuario(mensajes);

  if (!ultimo) {
    return {
      memoriasActivas: [],
      historialMemorias: [],
    };
  }

  if (esConsultaGeneralMemoria(ultimo.texto)) {
    return {
      memoriasActivas: await obtenerMemoriasActivas(db, LIMITE_MEMORIA_GENERAL),
      historialMemorias: [],
    };
  }

  const resultado = await buscarMemoriasRelevantesConPuntaje(
    db,
    crearConsultaMemoria(mensajes),
  );

  if (
    resultado.memorias.length > 0 &&
    resultado.puntajeMaximo >= UMBRAL_BUSQUEDA_DIRECTA
  ) {
    return separarMemorias(resultado.memorias);
  }

  const consulta = await consultarEcho(ai, ultimo.texto, db);

  return separarMemorias(await buscarMemoriasPorEcho(db, consulta));
}

async function procesarMemoria(
  ai: Ai,
  db: D1Database,
  mensajes: MensajeConversacion[],
) {
  const ultimo = obtenerUltimoUsuario(mensajes);

  if (!ultimo) {
    return {
      eventos: [] as EventoMemoria[],
      mensajeMemoria: "",
    };
  }

  const aclaracion = await resolverAclaracionPendiente(db, mensajes);

  const mensajeMemoria = aclaracion ?? ultimo.texto;

  try {
    const eventos = await procesarMemoriaAutomatica(ai, db, mensajeMemoria);

    return {
      eventos,
      mensajeMemoria,
    };
  } catch (error) {
    console.error("[NOVA] Error procesando memoria:", error);

    return {
      eventos: [] as EventoMemoria[],
      mensajeMemoria,
    };
  }
}

async function prepararFlujo(ai: Ai, db: D1Database, datos: DatosChat) {
  const ultimo = obtenerUltimoUsuario(datos.mensajes);

  const { eventos } = await procesarMemoria(ai, db, datos.mensajes);

  if (ultimo) {
    const respuestaEvento = crearRespuestaEvento(eventos, ultimo.texto);

    if (respuestaEvento) {
      return {
        directa: respuestaEvento,
        eventos,
        memoriasActivas: [],
        historialMemorias: [],
      };
    }

    if (!esConsultaGeneralMemoria(ultimo.texto)) {
      const directa = await responderDirectamente(db, ultimo.texto);

      if (directa) {
        return {
          directa,
          eventos,
          memoriasActivas: [],
          historialMemorias: [],
        };
      }
    }
  }

  const { memoriasActivas, historialMemorias } = await obtenerMemorias(
    ai,
    db,
    datos.mensajes,
  );

  return {
    directa: null,
    eventos,
    memoriasActivas,
    historialMemorias,
  };
}

export async function procesarChatStream(
  ai: Ai,
  db: D1Database,
  datos: DatosChat,
) {
  const flujo = await prepararFlujo(ai, db, datos);

  if (flujo.directa) {
    return crearStreamRespuesta(flujo.directa);
  }

  return generarRespuestaNovaStream(
    ai,
    datos.mensajes,
    datos.contextoSistema,
    flujo.memoriasActivas,
    flujo.historialMemorias,
    flujo.eventos,
    db,
  );
}

export async function procesarChat(ai: Ai, db: D1Database, datos: DatosChat) {
  const flujo = await prepararFlujo(ai, db, datos);

  if (flujo.directa) {
    return flujo.directa;
  }

  return generarRespuestaNova(
    ai,
    datos.mensajes,
    datos.contextoSistema,
    flujo.memoriasActivas,
    flujo.historialMemorias,
    flujo.eventos,
    db,
  );
}
