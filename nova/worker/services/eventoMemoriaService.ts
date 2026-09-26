export type EventoMemoria = {
  accion: "creada" | "actualizada" | "sin_cambio";
  entidadId: number;
  entidad: string;
  clave: string;
  valorAnterior: string | null;
  valorNuevo: string;
};

export function prepararEventosMemoria(
  eventos: EventoMemoria[],
) {
  if (eventos.length === 0) {
    return "Ninguno.";
  }

  return eventos
    .map((evento) => {
      if (
        evento.accion === "actualizada" &&
        evento.valorAnterior
      ) {
        return [
          `- ${evento.entidad}`,
          `  propiedad: ${evento.clave}`,
          `  cambio confirmado: ${evento.valorAnterior} → ${evento.valorNuevo}`,
        ].join("\n");
      }

      if (evento.accion === "creada") {
        return [
          `- ${evento.entidad}`,
          `  propiedad: ${evento.clave}`,
          `  valor confirmado: ${evento.valorNuevo}`,
        ].join("\n");
      }

      return [
        `- ${evento.entidad}`,
        `  propiedad: ${evento.clave}`,
        `  valor sin cambios: ${evento.valorNuevo}`,
      ].join("\n");
    })
    .join("\n\n");
}