import type { EstadoServicio, TipoServicio } from './serviciosService';

export type ServicioAgenda = { id: number; tecnico_id: number; tecnico_nombre: string; fecha_programada: string;
  tipo: TipoServicio; estado: EstadoServicio; cliente_nombre: string; maquina: string; ciudad: string | null };
export type TecnicoDia = { id: number; nombre: string; activo: number;
  estado: 'disponible' | 'programado' | 'no_disponible' | 'sobrecarga'; motivo: string | null;
  presenciales: ServicioAgenda[]; remotos: ServicioAgenda[] };
export type DiaAgenda = { fecha: string; tecnicos: TecnicoDia[] };
export type AgendaMes = { mes: string; hoy: string; dias: DiaAgenda[] };
export type InicioOperacion = { hoy: string;
  resumen: { servicios_hoy: number; en_proceso: number; realizados: number; tecnicos_libres: number };
  servicios: ServicioAgenda[]; tecnicos: TecnicoDia[] };

export async function consultarOperacion<T>(ruta: string, signal?: AbortSignal): Promise<T> {
  let respuesta: Response;
  try { respuesta = await fetch(ruta, { credentials: 'include', signal }); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('No se pudo conectar con ServiceOS. Intenta de nuevo.');
  }
  const datos = await respuesta.json().catch(() => null);
  if (respuesta.status === 401) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  if (respuesta.status === 403) throw new Error('Esta pantalla está reservada al coordinador.');
  if (!respuesta.ok || datos?.status !== 'ok') throw new Error(datos?.message ?? 'No se pudo consultar la operación.');
  return datos as T;
}
