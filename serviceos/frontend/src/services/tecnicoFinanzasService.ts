export type ResumenPersonal = { mes: string; pago_generado: number; servicios_con_pago: number };

export async function obtenerComisionPersonal(signal?: AbortSignal): Promise<ResumenPersonal> {
  const respuesta = await fetch('/api/tecnico/resumen-financiero', { credentials: 'include', signal });
  const cuerpo = await respuesta.json();
  if (!respuesta.ok) throw new Error(cuerpo.message ?? 'No se pudo consultar tu comisión.');
  return cuerpo;
}
