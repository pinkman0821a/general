import type { EstadoServicio, TipoServicio } from './serviciosService';

export type TecnicoFinanzas = {
  id: number; nombre: string; activo: number; servicios_con_pago: number;
  pendientes: number; en_proceso: number; realizados: number; pago_generado: number;
};
export type ResumenFinanzas = {
  mes: string;
  resumen: { pago_tecnicos: number; servicios_con_pago: number; tecnicos_con_actividad: number; promedio_por_servicio: number };
  tecnicos: TecnicoFinanzas[];
  historico: { mes: string; pago_generado: number }[];
  historico_tecnicos: { mes: string; tecnicos: TecnicoFinanzas[] }[];
  comparacion: { mes_anterior: string; pago_anterior: number; diferencia: number; porcentaje: number | null };
};
export type DetalleFinanzas = {
  mes: string; tecnico: { id: number; nombre: string; activo: number }; pago_generado: number;
  servicios: { id: number; fecha_programada: string; cliente_nombre: string; tipo: TipoServicio;
    estado: EstadoServicio; valor_servicio: number | null; pago_tecnico: number }[];
};

async function solicitarFinanzas<T>(ruta: string, signal?: AbortSignal): Promise<T> {
  let respuesta: Response;
  try { respuesta = await fetch(ruta, { credentials: 'include', signal }); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('No se pudo conectar con ServiceOS. Revisa tu conexión e intenta de nuevo.');
  }
  const datos = await respuesta.json().catch(() => null) as (T & { status: string; message?: string }) | null;
  if (respuesta.status === 401) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  if (respuesta.status === 403) throw new Error('Finanzas está reservado al coordinador.');
  if (!respuesta.ok || datos?.status !== 'ok') throw new Error(datos?.message ?? 'No se pudo consultar Finanzas.');
  return datos;
}

export function obtenerFinanzas(mes: string, signal?: AbortSignal) {
  return solicitarFinanzas<ResumenFinanzas>(`/api/finanzas/resumen?${new URLSearchParams({ mes })}`, signal);
}

export function obtenerDetalleFinanzas(id: number, mes: string, signal?: AbortSignal) {
  return solicitarFinanzas<DetalleFinanzas>(`/api/finanzas/tecnicos/${id}?${new URLSearchParams({ mes })}`, signal);
}
