import type { EstadoServicio, Servicio, TipoServicio } from '../../services/serviciosService';

export const tiposServicio: Record<TipoServicio, string> = {
  garantia: 'Garantía', servicio_presencial: 'Servicio presencial', servicio_remoto: 'Servicio remoto',
  instalacion: 'Instalación', instalacion_remota: 'Instalación remota',
};
export const estadosServicio: Record<EstadoServicio, string> = {
  pendiente: 'Pendiente', en_proceso: 'En proceso', realizado: 'Realizado',
};
export function esPresencial(tipo: TipoServicio) {
  return ['garantia', 'servicio_presencial', 'instalacion'].includes(tipo);
}
export function admiteValor(tipo: TipoServicio) {
  return tipo === 'servicio_presencial' || tipo === 'servicio_remoto';
}
export function requiereFalla(tipo: TipoServicio) {
  return tipo !== 'instalacion' && tipo !== 'instalacion_remota';
}
export function fechaLocal(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const resultado = new Date(0);
  resultado.setFullYear(anio, mes - 1, dia);
  resultado.setHours(12, 0, 0, 0);
  return resultado;
}
export function mostrarFecha(fecha: string, corta = false) {
  return fechaLocal(fecha).toLocaleDateString('es-CO', corta
    ? { day: '2-digit', month: 'short' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
}
export function mesActual(hoy = new Date()) {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}
export function moverMes(mes: string, desplazamiento: number) {
  const fecha = fechaLocal(`${mes}-01`);
  fecha.setMonth(fecha.getMonth() + desplazamiento);
  return mesActual(fecha);
}
export function mensajeError(causa: unknown) {
  return causa instanceof Error ? causa.message : 'No se pudo completar la operación.';
}
export function contarEstados(lista: Servicio[]) {
  return lista.reduce((cuentas, servicio) => {
    cuentas[servicio.estado] += 1;
    return cuentas;
  }, { pendiente: 0, en_proceso: 0, realizado: 0 });
}
