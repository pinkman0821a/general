import type { Recepcion } from '../../services/tallerService';
import { mostrarFecha } from './tallerAyudas';

type Props = {
  recepcion: Recepcion;
  seleccionada: boolean;
  ocupado: boolean;
  abrir: () => void;
};

export default function TarjetaTaller({ recepcion, seleccionada, ocupado, abrir }: Props) {
  return (
    <button type="button" className={`taller-tarjeta ${seleccionada ? 'seleccionada' : ''}`}
      aria-pressed={seleccionada} disabled={ocupado} onClick={abrir}>
      <span className="taller-tarjeta-cabecera">
        <strong>{recepcion.cliente_nombre}</strong>
        <span className={`taller-estado ${recepcion.estado}`}>
          {recepcion.estado === 'en_taller' ? 'En taller' : 'Entregada'}
        </span>
      </span>
      <span className="taller-maquina">
        {recepcion.maquina_tipo}{recepcion.maquina_tamano && ` · ${recepcion.maquina_tamano}`}
      </span>
      <span className="taller-fecha">Ingreso: {mostrarFecha(recepcion.fecha_ingreso)}</span>
      <span className="taller-falla-resumen">{recepcion.falla_reportada}</span>
      {recepcion.fecha_entrega && (
        <span className="taller-fecha">Entrega: {mostrarFecha(recepcion.fecha_entrega)}</span>
      )}
    </button>
  );
}
