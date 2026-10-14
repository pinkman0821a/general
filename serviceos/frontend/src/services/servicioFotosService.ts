export type FotoServicio = { id: number; nombre_original: string | null; mime: string; size: number; orden: number; created_at: string };
export const maximoFotosMensaje = 'Puedes adjuntar máximo 5 fotos por servicio.';
export function validarFoto(archivo: Blob) {
  if (!archivo.size) throw new Error('La foto está vacía.');
  if (archivo.size > 5 * 1024 * 1024) throw new Error('Cada foto puede pesar máximo 5 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) throw new Error('Selecciona fotos JPEG, PNG o WebP.');
}

async function solicitar(id: number, fotoId?: number, opciones: RequestInit = {}) {
  let respuesta: Response;
  try { respuesta = await fetch(`/api/servicios/${id}/fotos${fotoId === undefined ? '' : `/${fotoId}`}`, { ...opciones, credentials: 'include' }); }
  catch (causa) {
    if (opciones.signal?.aborted) throw causa;
    throw new Error('No se pudo confirmar el guardado o la descarga de fotos. Reintenta sin crear otro servicio.');
  }
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null);
    throw new Error(datos?.message ?? 'No se pudieron gestionar las fotos del servicio.');
  }
  return respuesta;
}
export async function listarFotos(id: number, signal?: AbortSignal): Promise<FotoServicio[]> {
  return (await (await solicitar(id, undefined, { signal })).json()).fotos;
}
export async function obtenerFoto(id: number, fotoId: number, signal?: AbortSignal) {
  const blob = await (await solicitar(id, fotoId, { signal })).blob();
  validarFoto(blob);
  return blob;
}
export async function guardarFotos(id: number, archivos: File[], eliminar: number[], lote: string): Promise<{ fotos: FotoServicio[]; aviso?: string }> {
  if (archivos.length > 5) throw new Error(maximoFotosMensaje);
  const body = new FormData();
  for (const archivo of archivos) { validarFoto(archivo); body.append('archivos', archivo); }
  body.append('eliminar', JSON.stringify(eliminar));
  return (await solicitar(id, undefined, { method: 'POST', body, headers: { 'Idempotency-Key': lote } })).json();
}
