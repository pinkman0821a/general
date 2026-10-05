export type AccesorioFrecuente = { id: number; nombre: string; created_at: string };
type Respuesta = {
  status: string;
  message?: string;
  accesorios?: AccesorioFrecuente[];
  accesorio?: AccesorioFrecuente;
};
const ruta = '/api/taller/accesorios-catalogo';

async function solicitar(url: string, opciones: RequestInit = {}) {
  const respuesta = await fetch(url, { ...opciones, credentials: 'include' });
  const datos = await respuesta.json().catch(() => null) as Respuesta | null;
  if (!respuesta.ok || datos?.status !== 'ok') {
    throw new Error(datos?.message ?? 'No se pudo gestionar el catálogo de accesorios');
  }
  return datos;
}

export async function listarAccesoriosFrecuentes(signal?: AbortSignal) {
  const datos = await solicitar(ruta, { signal });
  if (!datos.accesorios) throw new Error('No se pudieron cargar los accesorios frecuentes');
  return datos.accesorios;
}

export async function crearAccesorioFrecuente(nombre: string) {
  const datos = await solicitar(ruta, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: nombre.trim() }),
  });
  if (!datos.accesorio) throw new Error('No se pudo agregar el accesorio frecuente');
  return datos.accesorio;
}

export async function eliminarAccesorioFrecuente(id: number) {
  await solicitar(`${ruta}/${id}`, { method: 'DELETE' });
}
