import type { AgendaMes } from '../../services/agendaService';
import { mostrarFecha } from '../servicios/serviciosAyudas';
import { calendarioAgenda, descripcionTecnico, estadosAgenda } from './agendaAyudas';

export default function CalendarioAgenda({ datos, seleccionado, seleccionar }: {
  datos: AgendaMes; seleccionado: string; seleccionar: (fecha: string, tecnico?: number) => void;
}) {
  const dias = new Map(datos.dias.map(dia => [dia.fecha, dia]));
  return <>
    <div className="agenda-leyenda" aria-label="Leyenda de disponibilidad">{Object.entries(estadosAgenda).map(([estado, texto]) =>
      <span key={estado} className={`agenda-estado ${estado}`}><i />{texto}</span>)}</div>
    <div className="agenda-calendario" aria-label="Calendario mensual">
      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dia => <div className="agenda-semana" key={dia}>{dia}</div>)}
      {calendarioAgenda(datos.mes).map((fecha, indice) => {
        if (!fecha) return <div className="agenda-celda vacia" key={`vacia-${indice}`} aria-hidden="true" />;
        const dia = dias.get(fecha);
        return <div className={`agenda-celda ${fecha === datos.hoy ? 'hoy' : ''} ${fecha === seleccionado ? 'seleccionada' : ''}`} key={fecha}>
          <button className="agenda-dia" type="button" aria-label={`Ver ${mostrarFecha(fecha)}`} aria-pressed={fecha === seleccionado}
            aria-current={fecha === datos.hoy ? 'date' : undefined} onClick={() => seleccionar(fecha)}>{Number(fecha.slice(-2))}</button>
          <div className="agenda-chips">{dia?.tecnicos.map(tecnico => <button type="button" key={tecnico.id}
            className={`agenda-chip ${tecnico.estado}`} onClick={() => seleccionar(fecha, tecnico.id)}
            title={`${tecnico.nombre} · ${descripcionTecnico(tecnico)}`}>
            <span>{tecnico.nombre}{!tecnico.activo && ' · Inactivo'}</span><small>{descripcionTecnico(tecnico)}</small>
            {!!tecnico.remotos.length && <small className="agenda-remoto">{tecnico.remotos.length} remoto{tecnico.remotos.length > 1 ? 's' : ''}</small>}
          </button>)}</div>
          <div className="agenda-indicadores" aria-hidden="true">{Object.keys(estadosAgenda).map(estado => {
            const cantidad = dia?.tecnicos.filter(tecnico => tecnico.estado === estado).length ?? 0;
            return cantidad ? <span className={estado} key={estado}>{cantidad}</span> : null;
          })}</div>
        </div>;
      })}
    </div>
  </>;
}
