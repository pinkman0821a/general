import type { Servicio } from '../../services/serviciosService';
import { mesActual } from '../servicios/serviciosAyudas';

export function resumenTecnico(servicios: Servicio[], hoy = new Date()) {
  const mes = mesActual(hoy);
  const fecha = `${mes}-${String(hoy.getDate()).padStart(2, '0')}`;
  const proximos = servicios.filter(servicio => servicio.estado !== 'realizado' && servicio.fecha_programada >= fecha)
    .sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada) || a.id - b.id).slice(0, 3);
  return {
    pendientes: servicios.filter(servicio => servicio.estado === 'pendiente').length,
    enProceso: servicios.filter(servicio => servicio.estado === 'en_proceso').length,
    realizadosMes: servicios.filter(servicio => servicio.estado === 'realizado' && servicio.fecha_programada.startsWith(mes)).length,
    serviciosHoy: servicios.filter(servicio => servicio.fecha_programada === fecha).length,
    proximos,
  };
}

export function enlaceServicio(servicio: Servicio) {
  return `/servicios/${servicio.id}`;
}
