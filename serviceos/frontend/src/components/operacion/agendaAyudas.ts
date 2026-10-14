import type { ServicioAgenda, TecnicoDia } from '../../services/agendaService';
import { fechaLocal, tiposServicio } from '../servicios/serviciosAyudas';

export const estadosAgenda = { disponible: 'Disponible', programado: 'Servicio programado',
  no_disponible: 'No disponible', sobrecarga: 'Sobrecarga' };

export function descripcionTecnico(tecnico: TecnicoDia) {
  if (tecnico.estado === 'no_disponible') return tecnico.motivo ? `No disponible · ${tecnico.motivo}` : 'No disponible';
  if (tecnico.estado === 'sobrecarga') return `${tecnico.presenciales.length} servicios presenciales`;
  const servicio = tecnico.presenciales[0];
  return servicio ? `${tiposServicio[servicio.tipo]}${servicio.ciudad ? ` · ${servicio.ciudad}` : ''}` : 'Disponible';
}

export function enlaceAgendaServicio(servicio: ServicioAgenda) {
  return `/servicios/${servicio.id}`;
}

export function calendarioAgenda(mes: string) {
  const primero = fechaLocal(`${mes}-01`);
  const ultimo = fechaLocal(`${mes}-01`);
  ultimo.setMonth(ultimo.getMonth() + 1, 0);
  const inicio = primero.getDay();
  return Array.from({ length: Math.ceil((inicio + ultimo.getDate()) / 7) * 7 }, (_, indice) => {
    const dia = indice - inicio + 1;
    return dia < 1 || dia > ultimo.getDate() ? null : `${mes}-${String(dia).padStart(2, '0')}`;
  });
}
