export type TipoServicio = 'garantia' | 'servicio_presencial' | 'servicio_remoto' | 'instalacion' | 'instalacion_remota';
export type EstadoServicio = 'pendiente' | 'en_proceso' | 'realizado';
export type DatosServicio = {
  tipo: TipoServicio;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha_programada: string;
  tecnico_id: number;
  maquina: string;
  tipo_falla: string | null;
  ciudad?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  valor_servicio?: number | null;
};
export type Servicio = DatosServicio & {
  id: number; estado: EstadoServicio;
  tiene_comprobante?: boolean;
  comprobante_nombre?: string | null;
  comprobante_mime?: string | null;
  comprobante_size?: number | null;
};
export type FiltrosServicio = {
  mes: string;
  estado: EstadoServicio | '';
  tipo: TipoServicio | '';
  tecnico_id: string;
  buscar: string;
};
export type PayloadServicio = Partial<DatosServicio> & { confirmar_sobrecarga?: boolean };
type Respuesta = {
  status: string;
  message?: string;
  servicios?: Servicio[];
  servicio?: Servicio;
  codigo?: string;
  presenciales_existentes?: number;
  presenciales_resultantes?: number;
};

export class ErrorSobrecarga extends Error {
  existentes: number;
  resultantes: number;
  constructor(existentes: number, resultantes: number) {
    super('La asignación provoca sobrecarga de agenda');
    this.existentes = existentes;
    this.resultantes = resultantes;
  }
}

async function solicitar(ruta: string, opciones: RequestInit = {}) {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, { ...opciones, credentials: 'include' });
  } catch (causa) {
    if (opciones.signal?.aborted) throw causa;
    throw new Error('No se pudo conectar con ServiceOS. Revisa tu conexión e intenta de nuevo.');
  }
  const datos = await respuesta.json().catch(() => null) as Respuesta | null;
  if (respuesta.status === 401) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  if (respuesta.status === 409 && datos?.codigo === 'sobrecarga_agenda'
    && typeof datos.presenciales_existentes === 'number' && typeof datos.presenciales_resultantes === 'number') {
    throw new ErrorSobrecarga(datos.presenciales_existentes, datos.presenciales_resultantes);
  }
  if (!respuesta.ok || datos?.status !== 'ok') {
    throw new Error(datos?.message ?? 'No se pudo completar la operación de Servicios.');
  }
  return datos;
}

export async function listarServicios(filtros: FiltrosServicio, signal?: AbortSignal) {
  const parametros = new URLSearchParams(filtros.mes ? { mes: filtros.mes } : {});
  for (const campo of ['estado', 'tipo', 'tecnico_id', 'buscar'] as const) {
    if (filtros[campo].trim()) parametros.set(campo, filtros[campo].trim());
  }
  const datos = await solicitar(`/api/servicios?${parametros}`, { signal });
  if (!datos.servicios) throw new Error('No se pudieron cargar los servicios.');
  return datos.servicios;
}

export async function obtenerServicio(id: number, signal?: AbortSignal) {
  const datos = await solicitar(`/api/servicios/${id}`, { signal });
  if (!datos.servicio) throw new Error('No se pudo cargar el servicio.');
  return datos.servicio;
}

async function guardar(ruta: string, method: string, body: PayloadServicio | { estado: EstadoServicio }) {
  const datos = await solicitar(ruta, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!datos.servicio) throw new Error('No se pudo guardar el servicio.');
  return datos.servicio;
}

export function crearServicio(datos: PayloadServicio) {
  return guardar('/api/servicios', 'POST', datos);
}
export function editarServicio(id: number, datos: PayloadServicio) {
  return guardar(`/api/servicios/${id}`, 'PATCH', datos);
}
export function cambiarEstadoServicio(id: number, estado: EstadoServicio) {
  return guardar(`/api/servicios/${id}/estado`, 'PATCH', { estado });
}

export async function eliminarServicio(id: number) {
  await solicitar(`/api/servicios/${id}`, { method: 'DELETE' });
}
