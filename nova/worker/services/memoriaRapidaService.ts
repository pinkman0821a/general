import type { MemoriaExtraida } from "./memoriaExtractor.js";
import {
  bloqueaMemoriaRapida,
  esMensajeIgnorable,
} from "./memoriaRapidaReglasService.js";
import {
  extraerMemoriasDeterministas,
} from "./memoriaRapidaExtractoresService.js";

export type ResultadoMemoriaRapida = {
  memorias: MemoriaExtraida[];
  usarIA: boolean;
};

export function analizarMemoriaRapida(
  mensaje: string,
): ResultadoMemoriaRapida {
  if (
    bloqueaMemoriaRapida(mensaje) ||
    esMensajeIgnorable(mensaje) ||
    mensaje.includes("?") ||
    mensaje.includes("¿")
  ) {
    return {
      memorias: [],
      usarIA: false,
    };
  }

  const memorias =
    extraerMemoriasDeterministas(mensaje);

  if (memorias.length > 0) {
    return {
      memorias,
      usarIA: false,
    };
  }

  return {
    memorias: [],
    usarIA: true,
  };
}