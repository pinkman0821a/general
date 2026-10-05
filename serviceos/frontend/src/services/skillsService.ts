export type Skill = {
  id: number;
  nombre: string;
  created_at: string;
};

export type AsignacionSkill = {
  tecnico_id: number;
  skill_id: number;
  created_at: string;
};

type RespuestaSkills = {
  status: string;
  message?: string;
  skills?: Skill[];
  skill?: Skill;
  asignacion?: AsignacionSkill;
};

async function solicitarSkills(
  ruta: string,
  mensajeError: string,
  opciones: RequestInit = {},
): Promise<RespuestaSkills> {
  const respuesta = await fetch(ruta, {
    ...opciones,
    credentials: "include",
  });
  const datos = (await respuesta.json()) as RespuestaSkills;

  if (!respuesta.ok || datos.status !== "ok") {
    throw new Error(datos.message ?? mensajeError);
  }

  return datos;
}

export async function listarCatalogoSkills(): Promise<Skill[]> {
  const mensaje = "No se pudo cargar el catálogo de skills";
  const datos = await solicitarSkills("/api/skills", mensaje);
  if (!datos.skills) throw new Error(mensaje);
  return datos.skills;
}

export async function crearSkill(nombre: string): Promise<Skill> {
  const mensaje = "No se pudo crear la skill";
  const datos = await solicitarSkills("/api/skills", mensaje, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: nombre.trim() }),
  });
  if (!datos.skill) throw new Error(mensaje);
  return datos.skill;
}

export async function listarSkillsTecnico(tecnicoId: number): Promise<Skill[]> {
  const mensaje = "No se pudieron cargar las skills del técnico";
  const datos = await solicitarSkills(`/api/tecnicos/${tecnicoId}/skills`, mensaje);
  if (!datos.skills) throw new Error(mensaje);
  return datos.skills;
}

export async function asignarSkill(
  tecnicoId: number,
  skillId: number,
): Promise<AsignacionSkill> {
  const mensaje = "No se pudo asignar la skill";
  const datos = await solicitarSkills(`/api/tecnicos/${tecnicoId}/skills`, mensaje, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill_id: skillId }),
  });
  if (!datos.asignacion) throw new Error(mensaje);
  return datos.asignacion;
}

export async function quitarSkill(tecnicoId: number, skillId: number): Promise<void> {
  await solicitarSkills(
    `/api/tecnicos/${tecnicoId}/skills/${skillId}`,
    "No se pudo quitar la skill",
    { method: "DELETE" },
  );
}
