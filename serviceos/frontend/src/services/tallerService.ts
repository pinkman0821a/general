export type EstadoTaller = 'en_taller' | 'entregada';

export type DatosIngreso = {
  cliente_nombre: string;
  cliente_contacto: string | null;
  cliente_telefono: string;
  maquina_tipo: string;
  maquina_tamano: string | null;
  maquina_marca: string | null;
  maquina_modelo: string | null;
  fecha_ingreso: string;
  falla_reportada: string;
  observaciones: string | null;
  accesorios: string[];
};

export type Recepcion = Omit<DatosIngreso, 'accesorios'> & {
  id: number;
  estado: EstadoTaller;
  fecha_entrega: string | null;
  created_at: string;
  updated_at: string;
};

export type Accesorio = {
  id: number;
  recepcion_id: number;
  nombre: string;
  devuelto: number;
  created_at: string;
};

export type DetalleRecepcion = Recepcion & { accesorios: Accesorio[] };
export type DatosEntrega = { fecha_entrega: string; accesorios_devueltos: number[] };
export type FiltroTaller = EstadoTaller | 'todas';

type RespuestaTaller = {
  status: string;
  message?: string;
  recepciones?: Recepcion[];
  recepcion?: DetalleRecepcion;
};

async function solicitarTaller(
  ruta: string, mensaje: string, opciones: RequestInit = {},
): Promise<RespuestaTaller> {
  const respuesta = await fetch(ruta, { ...opciones, credentials: 'include' });
  const datos = await respuesta.json().catch(() => null) as RespuestaTaller | null;
  if (!respuesta.ok || datos?.status !== 'ok') {
    throw new Error(datos?.message ?? mensaje);
  }
  return datos;
}

export async function listarTaller(
  filtro: FiltroTaller = 'todas', buscar = '', signal?: AbortSignal,
): Promise<Recepcion[]> {
  const parametros = new URLSearchParams();
  if (filtro !== 'todas') parametros.set('estado', filtro);
  if (buscar.trim()) parametros.set('buscar', buscar.trim());
  const mensaje = 'No se pudieron cargar las recepciones';
  const datos = await solicitarTaller(`/api/taller?${parametros}`, mensaje, { signal });
  if (!datos.recepciones) throw new Error(mensaje);
  return datos.recepciones;
}

export async function obtenerDetalleTaller(id: number, signal?: AbortSignal) {
  const mensaje = 'No se pudo cargar la recepción';
  const datos = await solicitarTaller(`/api/taller/${id}`, mensaje, { signal });
  if (!datos.recepcion) throw new Error(mensaje);
  return datos.recepcion;
}

async function guardarTaller(ruta: string, method: string, body: DatosIngreso | DatosEntrega) {
  const mensaje = 'No se pudo guardar la recepción';
  const datos = await solicitarTaller(ruta, mensaje, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!datos.recepcion) throw new Error(mensaje);
  return datos.recepcion;
}

export function crearRecepcion(datos: DatosIngreso) {
  return guardarTaller('/api/taller', 'POST', datos);
}

export function editarRecepcion(id: number, datos: DatosIngreso) {
  return guardarTaller(`/api/taller/${id}`, 'PATCH', datos);
}

export function guardarEntrega(id: number, datos: DatosEntrega) {
  return guardarTaller(`/api/taller/${id}/entrega`, 'PUT', datos);
}
