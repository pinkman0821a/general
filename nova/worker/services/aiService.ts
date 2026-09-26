import { INSTRUCCIONES_NOVA } from "../prompts/novaPrompt.js";
import {
  prepararEventosMemoria,
  type EventoMemoria,
} from "./eventoMemoriaService.js";
import type { Memoria } from "./memoriaService.js";
import {
  crearRespuestaEvento,
  crearStreamRespuesta,
} from "./respuestaEventoService.js";
import { contabilizarStream } from "./streamUsoService.js";
import { registrarUsoIA } from "./usoIaService.js";

const MODELO_NOVA = "@cf/meta/llama-3.1-8b-instruct-fp8";

export type MensajeConversacion = {
  autor: "usuario" | "nova";
  texto: string;
};

export type ContextoSistema = {
  fechaHoraLocal: string;
  fechaHoraUtc: string;
  zonaHoraria: string;
};

function pareceConversacionCasual(texto: string) {
  if (!texto.trim() || texto.includes("?") || texto.includes("¿")) {
    return false;
  }

  const normalizado = texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const parecePeticion = /^(?:explicame|ayudame|dime|indica|ensename|revisa|como|que|cual|quien|donde|cuando|por que|para que|puedes|podrias|necesito|quiero saber|me puedes)\b/.test(
    normalizado,
  );

  return !parecePeticion && !/\b(?:ayuda|explicacion|informacion)\b/.test(normalizado);
}

function limpiarRespuestaConversacionCasual(texto: string) {
  const oraciones: string[] = [];
  let inicio = 0;

  for (let indice = 0; indice < texto.length; indice += 1) {
    if (texto[indice] === "\n") {
      while (texto[indice + 1] === "\n") {
        indice += 1;
      }

      oraciones.push(texto.slice(inicio, indice + 1));
      inicio = indice + 1;
      continue;
    }

    if (!".!?".includes(texto[indice])) {
      continue;
    }

    let fin = indice + 1;
    while (fin < texto.length && "\"'”’»)]}*_".includes(texto[fin])) {
      fin += 1;
    }

    if (fin === texto.length || /\s/.test(texto[fin])) {
      oraciones.push(texto.slice(inicio, fin));
      inicio = fin;
      indice = fin - 1;
    }
  }

  if (inicio < texto.length) {
    oraciones.push(texto.slice(inicio));
  }

  const oracionesConservadas = oraciones.filter((oracion) => {
    if (oracion.includes("¿")) {
      return false;
    }

    let finalSinCierres = oracion.trimEnd();
    while (
      finalSinCierres.length > 0 &&
      "\"'”’»)]}*_".includes(finalSinCierres.at(-1)!)
    ) {
      finalSinCierres = finalSinCierres.slice(0, -1);
    }

    if (finalSinCierres.endsWith("?")) {
      return false;
    }

    const inicioNormalizado = oracion
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^(?:(?:[-*+]\s+|>\s*)+|[\s>*_`"'“¿¡(]+)/, "");

    return !/^(?:quieres\b|te gustaria\b|prefieres\b|puedes decirme\b|podrias decirme\b|como te\b|que tal\b|que piensas\b|que opinas\b)/.test(
      inicioNormalizado,
    );
  });

  const respuesta = oracionesConservadas.join("").trim();
  return respuesta || "Te sigo, Juan.";
}

function crearEtiquetasEntidades(
  memoriasActivas: Memoria[],
  historialMemorias: Memoria[],
) {
  const ids = [
    ...new Set(
      [...memoriasActivas, ...historialMemorias]
        .map((memoria) => memoria.entidad_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  ].sort((a, b) => a - b);

  const etiquetas = new Map<number, string>();

  ids.forEach((id, indice) => {
    etiquetas.set(id, `Entidad ${String.fromCharCode(65 + indice)}`);
  });

  return etiquetas;
}

function prepararMemorias(memorias: Memoria[], etiquetas: Map<number, string>) {
  if (memorias.length === 0) {
    return "Ninguna.";
  }

  const grupos = new Map<
    string,
    {
      titulo: string;
      memorias: Memoria[];
    }
  >();

  for (const memoria of memorias) {
    const tieneEntidadId = typeof memoria.entidad_id === "number";

    const claveGrupo = tieneEntidadId
      ? `id:${memoria.entidad_id}`
      : `sin-id:${memoria.tipo}:${memoria.entidad ?? "Juan"}`;

    if (!grupos.has(claveGrupo)) {
      const nombre = memoria.entidad?.trim() || "Juan";

      const etiqueta = tieneEntidadId
        ? etiquetas.get(memoria.entidad_id!)
        : null;

      grupos.set(claveGrupo, {
        titulo: etiqueta ? `[${etiqueta}] ${nombre}` : nombre,
        memorias: [],
      });
    }

    grupos.get(claveGrupo)!.memorias.push(memoria);
  }

  return [...grupos.values()]
    .map((grupo) => {
      const datos = grupo.memorias
        .map((memoria) => `  - ${memoria.clave} = ${memoria.valor}`)
        .join("\n");

      return `${grupo.titulo}\n${datos}`;
    })
    .join("\n\n");
}

function prepararMensajes(
  mensajes: MensajeConversacion[],
  contextoSistema: ContextoSistema,
  memoriasActivas: Memoria[],
  historialMemorias: Memoria[],
  eventosMemoria: EventoMemoria[],
) {
  const etiquetas = crearEtiquetasEntidades(memoriasActivas, historialMemorias);
  const ultimoMensajeUsuario = obtenerUltimoUsuario(mensajes);
  const instruccionConversacionCasual = pareceConversacionCasual(
    ultimoMensajeUsuario,
  )
    ? `

MODO CONVERSACIÓN CASUAL ACTIVO.

El último mensaje de Juan es un comentario o afirmación, no una solicitud.

Para esta respuesta debes cumplir obligatoriamente:

- Responde reaccionando únicamente a lo que Juan realmente dijo.
- Máximo 2 o 3 oraciones.
- NO hagas preguntas.
- NO uses signos "?" ni "¿".
- NO pidas más información.
- NO ofrezcas ayuda automáticamente.
- NO inventes situaciones, actividades, personas ni detalles.
- NO expliques términos técnicos si Juan no lo pidió.
- No conviertas la conversación en una entrevista.
- Responde como una asistente personal cercana que simplemente está conversando.

Ejemplo:

Juan:
"Hoy he estado todo el día en aeropuertos y hubo muchas turbulencias."

Respuesta adecuada:
"Uy, día pesado. Entre tantas horas en aeropuertos y las turbulencias, hoy sí te tocó una jornada cansona."

Respuesta NO adecuada:
"Eso suena agotador. ¿Te sientes bien? ¿Quieres hablar de ello?"`
    : "";

  const instruccionesSistema = `
${INSTRUCCIONES_NOVA}

CONTEXTO ACTUAL:

Fecha y hora local:
${contextoSistema.fechaHoraLocal}

Zona horaria:
${contextoSistema.zonaHoraria}

Fecha y hora UTC:
${contextoSistema.fechaHoraUtc}

CAMBIOS CONFIRMADOS EN ESTE MENSAJE:

${prepararEventosMemoria(eventosMemoria)}

RECUERDOS ACTUALES:

${prepararMemorias(memoriasActivas, etiquetas)}

RECUERDOS ANTERIORES:

${prepararMemorias(historialMemorias, etiquetas)}

REGLAS DE MEMORIA:

Los cambios confirmados son hechos ya resueltos por el sistema.

Usa los recuerdos actuales para hablar del presente.

Usa los recuerdos anteriores solamente cuando Juan pregunte por el pasado.

Cuando existan varias entidades con el mismo nombre base, trátalas como entidades diferentes.

Las etiquetas internas existen únicamente para distinguir entidades.

Nunca menciones etiquetas internas, IDs, estructura, base de datos o forma de almacenamiento.

Nunca digas "según mis recuerdos", "según mi base de datos" o similares.

Nunca inventes información personal.

Si no conoces un dato, dilo directamente.

REGLAS TEMPORALES:

La fecha y hora del contexto actual son la fuente de verdad.

Nunca inventes fechas u horas.

REGLAS DE UBICACIÓN:

La zona horaria no demuestra la ubicación física de Juan.
${instruccionConversacionCasual}
`.trim();

  return [
    {
      role: "system" as const,
      content: instruccionesSistema,
    },
    ...mensajes.map((mensaje) => ({
      role:
        mensaje.autor === "usuario"
          ? ("user" as const)
          : ("assistant" as const),
      content: mensaje.texto,
    })),
  ];
}

function obtenerUltimoUsuario(mensajes: MensajeConversacion[]) {
  return (
    [...mensajes].reverse().find((mensaje) => mensaje.autor === "usuario")
      ?.texto ?? ""
  );
}

export async function generarRespuestaNova(
  ai: Ai,
  mensajes: MensajeConversacion[],
  contextoSistema: ContextoSistema,
  memoriasActivas: Memoria[],
  historialMemorias: Memoria[],
  eventosMemoria: EventoMemoria[] = [],
  db?: D1Database,
) {
  const respuestaDirecta = crearRespuestaEvento(
    eventosMemoria,
    obtenerUltimoUsuario(mensajes),
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

  return pareceConversacionCasual(obtenerUltimoUsuario(mensajes))
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
  const respuestaDirecta = crearRespuestaEvento(
    eventosMemoria,
    obtenerUltimoUsuario(mensajes),
  );

  if (respuestaDirecta) {
    return crearStreamRespuesta(respuestaDirecta);
  }

  if (pareceConversacionCasual(obtenerUltimoUsuario(mensajes))) {
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

  return contabilizarStream(stream as ReadableStream<Uint8Array>, db);
}
