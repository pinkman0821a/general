import type { Servicio } from './serviciosService';

export const formatosComprobante = ['image/jpeg', 'image/png', 'image/webp'];
export function validarArchivoComprobante(archivo: Blob) {
  if (!archivo.size) throw new Error('El archivo está vacío.');
  if (archivo.size > 5 * 1024 * 1024) throw new Error('El comprobante no puede superar 5 MB.');
  if (!formatosComprobante.includes(archivo.type)) throw new Error('Selecciona una imagen JPEG, PNG o WebP.');
}

async function solicitarComprobante(id: number, opciones: RequestInit = {}) {
  let respuesta: Response;
  try { respuesta = await fetch(`/api/servicios/${id}/comprobante`, { ...opciones, credentials: 'include' }); }
  catch (causa) {
    if (opciones.signal?.aborted) throw causa;
    throw new Error('No se pudo conectar con ServiceOS. Revisa tu conexión e intenta de nuevo.');
  }
  if (respuesta.status === 401) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null) as { message?: string } | null;
    throw new Error(datos?.message ?? 'No se pudo gestionar el comprobante de pago.');
  }
  return respuesta;
}

type ResultadoComprobante = { servicio: Servicio; aviso?: string };
async function leerResultado(respuesta: Response): Promise<ResultadoComprobante> {
  const datos = await respuesta.json() as { status?: string; servicio?: Servicio; aviso?: string };
  if (datos.status !== 'ok' || !datos.servicio) throw new Error('No se pudo actualizar el comprobante.');
  return { servicio: datos.servicio, aviso: datos.aviso };
}
export async function subirComprobante(id: number, archivo: File) {
  validarArchivoComprobante(archivo);
  const body = new FormData();
  body.append('archivo', archivo);
  return leerResultado(await solicitarComprobante(id, { method: 'PUT', body }));
}
export async function eliminarComprobante(id: number) {
  return leerResultado(await solicitarComprobante(id, { method: 'DELETE' }));
}
export async function obtenerComprobante(id: number, signal?: AbortSignal) {
  const respuesta = await solicitarComprobante(id, { signal });
  const blob = await respuesta.blob();
  validarArchivoComprobante(blob);
  return blob;
}

// Toda URL del visor es temporal y se libera al cerrar, sustituir o desmontar.
export function crearVisorComprobante(mostrar: (url: string | null) => void) {
  let actual: string | null = null;
  function liberar() {
    if (actual) URL.revokeObjectURL(actual);
    actual = null;
  }
  return {
    abrir(blob: Blob) { liberar(); actual = URL.createObjectURL(blob); mostrar(actual); },
    cerrar() { liberar(); mostrar(null); },
    destruir: liberar,
  };
}
