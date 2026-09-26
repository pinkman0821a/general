import { INSTRUCCIONES_NOVA } from "../prompts/novaPrompt.js";
import {
  prepararEventosMemoria,
  type EventoMemoria,
} from "./eventoMemoriaService.js";
import type { Memoria } from "./memoriaService.js";
import { pareceConversacionCasual } from "./aiConversacionService.js";
import { esConsultaGeneralMemoria } from "./consultaMemoriaGeneralService.js";

export type MensajeConversacion = {
  autor: "usuario" | "nova";
  texto: string;
};

export type ContextoSistema = {
  fechaHoraLocal: string;
  fechaHoraUtc: string;
  zonaHoraria: string;
};

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

export function prepararMensajes(
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

  const instruccionMemoriaGeneral = esConsultaGeneralMemoria(
    ultimoMensajeUsuario,
  )
    ? `

MODO CONSULTA GENERAL DE MEMORIA ACTIVO.

Juan está preguntando de forma general qué sabes o recuerdas sobre él.

Para esta respuesta debes cumplir:

- Usa los recuerdos actuales disponibles como conjunto, no solamente uno.
- Resume varios datos diferentes cuando existan varios recuerdos.
- Si existen 3 o más hechos útiles, menciona al menos 3 hechos distintos.
- Prioriza primero información directamente relacionada con Juan.
- También puedes mencionar proyectos, objetos o contexto relacionado con él cuando ayuden a responder.
- No conviertas información propia de NOVA en una característica personal de Juan.
- No digas que no tienes más información si existen otros recuerdos actuales disponibles.
- No inventes datos para completar la respuesta.
- Habla de forma natural, como alguien que recuerda a la persona.
- No menciones base de datos, registros, IDs, etiquetas ni mecanismos internos.
- No es necesario enumerar absolutamente todos los recuerdos si hay muchos.`
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
${instruccionMemoriaGeneral}
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

export function obtenerUltimoUsuario(mensajes: MensajeConversacion[]) {
  return (
    [...mensajes].reverse().find((mensaje) => mensaje.autor === "usuario")
      ?.texto ?? ""
  );
}
