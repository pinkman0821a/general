import type { FiltrosServicio, TipoServicio } from '../../services/serviciosService';
import { estadosServicio, mesActual, tiposServicio } from './serviciosAyudas';

export function filtrosDesdeUrl(parametros: URLSearchParams): FiltrosServicio {
  const mes = parametros.get('mes') ?? '', estado = parametros.get('estado') ?? '', tipo = parametros.get('tipo') ?? '';
  const tecnico = parametros.get('tecnico_id') ?? '';
  return { mes: /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : mesActual(),
    estado: Object.hasOwn(estadosServicio, estado) ? estado as FiltrosServicio['estado'] : '',
    tipo: Object.hasOwn(tiposServicio, tipo) ? tipo as TipoServicio : '',
    tecnico_id: /^\d+$/.test(tecnico) && Number.isSafeInteger(Number(tecnico)) && Number(tecnico) > 0 ? tecnico : '',
    buscar: parametros.get('buscar') ?? '' };
}

export function parametrosFiltros(filtros: FiltrosServicio) {
  return new URLSearchParams(Object.entries(filtros).filter(([, valor]) => valor !== ''));
}

export function volverAlListado(estado: unknown) {
  if (estado && typeof estado === 'object' && 'volverServicios' in estado && typeof estado.volverServicios === 'string'
    && /^\/servicios(?:\?|$)/.test(estado.volverServicios)) return estado.volverServicios;
  return '/servicios';
}
