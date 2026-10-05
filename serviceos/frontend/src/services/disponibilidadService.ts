export type Indisponibilidad = {
  id: number;
  tecnico_id: number;
  fecha: string;
  motivo: string | null;
  created_at: string;
};

type RespuestaDisponibilidad = {
  status: string;
  message?: string;
  indisponibilidades?: Indisponibilidad[];
  indisponibilidad?: Indisponibilidad;
};

async function solicitarDisponibilidad(
  ruta: string,
  mensajeError: string,
  opciones: RequestInit = {},
): Promise<RespuestaDisponibilidad> {
  const respuesta = await fetch(ruta, { ...opciones, credentials: "include" });
  const datos = (await respuesta.json()) as RespuestaDisponibilidad;
  if (!respuesta.ok || datos.status !== "ok") {
    throw new Error(datos.message ?? mensajeError);
  }
  return datos;
}

export async function listarIndisponibilidades(
  tecnicoId: number,
  desde: string,
  hasta: string,
  signal?: AbortSignal,
): Promise<Indisponibilidad[]> {
  const mensaje = "No se pudo cargar la disponibilidad";
  const rango = new URLSearchParams({ desde, hasta });
  const datos = await solicitarDisponibilidad(
    `/api/tecnicos/${tecnicoId}/disponibilidad?${rango}`, mensaje, { signal },
  );
  if (!datos.indisponibilidades) throw new Error(mensaje);
  return datos.indisponibilidades;
}

export async function crearIndisponibilidad(
  tecnicoId: number,
  fecha: string,
  motivo?: string,
): Promise<Indisponibilidad> {
  const mensaje = "No se pudo marcar el día como no disponible";
  const datos = await solicitarDisponibilidad(
    `/api/tecnicos/${tecnicoId}/disponibilidad`, mensaje, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha, motivo: motivo?.trim() || undefined }),
    },
  );
  if (!datos.indisponibilidad) throw new Error(mensaje);
  return datos.indisponibilidad;
}

export async function eliminarIndisponibilidad(tecnicoId: number, fecha: string): Promise<void> {
  await solicitarDisponibilidad(
    `/api/tecnicos/${tecnicoId}/disponibilidad/${encodeURIComponent(fecha)}`,
    "No se pudo marcar el día como disponible",
    { method: "DELETE" },
  );
}
