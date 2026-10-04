export type Tecnico = {
  id: number;
  nombre: string;
  user: string;
  activo: number;
  created_at: string;
};

type TecnicosRespuesta = {
  status: string;
  tecnicos?: Tecnico[];
  message?: string;
};

export async function listarTecnicos(): Promise<Tecnico[]> {
  const respuesta = await fetch("/api/tecnicos", {
    credentials: "include",
  });

  const datos = (await respuesta.json()) as TecnicosRespuesta;

  if (!respuesta.ok || !datos.tecnicos) {
    throw new Error(datos.message ?? "No se pudieron cargar los técnicos");
  }

  return datos.tecnicos;
}