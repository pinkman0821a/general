import { mostrarFecha } from './calendarioDisponibilidad';
import { claseOcupacion } from './serviciosCalendario';

type Props = {
  fecha: string; dia: number; cantidad: number; noDisponible: boolean;
  seleccionado: boolean; sinConsultar: boolean; serviciosSinConsultar: boolean;
  deshabilitado: boolean; seleccionar: () => void;
};
export default function DiaDisponibilidad(props: Props) {
  const disponibilidad = props.sinConsultar ? 'disponibilidad sin consultar' : props.noDisponible ? 'no disponible' : 'disponible';
  const agenda = props.serviciosSinConsultar ? 'servicios sin consultar' : `${props.cantidad} servicios presenciales${props.cantidad >= 2 ? ', sobrecarga' : ''}`;
  return <button type="button"
    className={`disponibilidad-dia ${props.noDisponible ? 'no-disponible' : ''} ${claseOcupacion(props.cantidad)}`}
    disabled={props.deshabilitado} aria-pressed={props.seleccionado}
    aria-label={`${mostrarFecha(props.fecha)}: ${disponibilidad}; ${agenda}`} onClick={props.seleccionar}>
    {props.dia}
    {props.cantidad > 0 && <span className="disponibilidad-conteo" aria-hidden="true">{props.cantidad}</span>}
    {props.noDisponible && <span className="disponibilidad-marca" aria-hidden="true" />}
  </button>;
}
