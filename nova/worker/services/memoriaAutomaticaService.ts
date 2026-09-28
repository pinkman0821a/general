import { obtenerEntidadPorId } from "./entidadService.js";
import { resolverEntidad } from "./entidadResolverService.js";
import type { EventoMemoria } from "./eventoMemoriaService.js";
import { extraerMemorias } from "./memoriaExtractor.js";
import { analizarMemoriaRapida } from "./memoriaRapidaService.js";
import {
  buscarMemoriaActivaPorEntidadId,
  desactivarMemoria,
  guardarMemoria,
} from "./memoriaService.js";

function normalizar(valor: string | null | undefined) {
  return (valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function procesarMemoriaAutomatica(
  ai: Ai,
  db: D1Database,
  mensajeUsuario: string,
): Promise<EventoMemoria[]> {
  const analisisRapido = analizarMemoriaRapida(mensajeUsuario);

  const memorias = analisisRapido.usarIA
    ? await extraerMemorias(ai, mensajeUsuario, db)
    : analisisRapido.memorias;

  const eventos: EventoMemoria[] = [];

  for (const memoria of memorias) {
    const entidadResuelta = await resolverEntidad(db, mensajeUsuario, memoria);

    if (!entidadResuelta) {
      continue;
    }

    const { entidadId, esNueva } = entidadResuelta;

    const entidadReal = await obtenerEntidadPorId(db, entidadId);

    const nombreEntidad = entidadReal?.nombre_base ?? memoria.entidad ?? "Juan";

    if (esNueva) {
      await guardarMemoria(db, {
        ...memoria,
        entidadId,
        fuente: "conversacion_automatica",
      });

      eventos.push({
        accion: "creada",
        entidadId,
        entidad: nombreEntidad,
        clave: memoria.clave,
        valorAnterior: null,
        valorNuevo: memoria.valor,
      });

      continue;
    }

    const existente = await buscarMemoriaActivaPorEntidadId(
      db,
      entidadId,
      memoria.clave,
    );

    if (!existente) {
      await guardarMemoria(db, {
        ...memoria,
        entidadId,
        fuente: "conversacion_automatica",
      });

      eventos.push({
        accion: "creada",
        entidadId,
        entidad: nombreEntidad,
        clave: memoria.clave,
        valorAnterior: null,
        valorNuevo: memoria.valor,
      });

      continue;
    }

    if (normalizar(existente.valor) === normalizar(memoria.valor)) {
      eventos.push({
        accion: "sin_cambio",
        entidadId,
        entidad: nombreEntidad,
        clave: memoria.clave,
        valorAnterior: existente.valor,
        valorNuevo: memoria.valor,
      });

      continue;
    }

    await desactivarMemoria(db, existente.id);

    await guardarMemoria(db, {
      ...memoria,
      entidadId,
      fuente: "conversacion_automatica",
      reemplazaId: existente.id,
    });

    eventos.push({
      accion: "actualizada",
      entidadId,
      entidad: nombreEntidad,
      clave: memoria.clave,
      valorAnterior: existente.valor,
      valorNuevo: memoria.valor,
    });
  }

  return eventos;
}
