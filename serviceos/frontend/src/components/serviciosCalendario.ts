import { listarServicios, type Servicio } from '../services/serviciosService';
import { esPresencial } from './servicios/serviciosAyudas';

export function consultarServiciosCalendario(tecnicoId: number, mes: string, signal?: AbortSignal) {
  return listarServicios({ mes, tecnico_id: String(tecnicoId), estado: '', tipo: '', buscar: '' }, signal);
}

export function agruparPresenciales(servicios: Servicio[]) {
  const dias: Record<string, Servicio[]> = {};
  for (const servicio of servicios) {
    if (esPresencial(servicio.tipo)) (dias[servicio.fecha_programada] ??= []).push(servicio);
  }
  return dias;
}

export function claseOcupacion(cantidad: number) {
  return cantidad >= 2 ? 'agenda-sobrecarga' : cantidad === 1 ? 'agenda-ocupada' : '';
}
