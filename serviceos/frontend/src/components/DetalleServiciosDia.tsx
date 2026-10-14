import { Link } from 'react-router-dom';
import type { Servicio } from '../services/serviciosService';
import { mostrarFecha, tiposServicio } from './servicios/serviciosAyudas';
import EstadoServicio from './servicios/EstadoServicio';

export default function DetalleServiciosDia({ fecha, servicios }: { fecha: string; servicios: Servicio[] }) {
  return <section className="disponibilidad-servicios" aria-label="Servicios del día">
    <h4>{mostrarFecha(fecha)}</h4>
    <p className="disponibilidad-ayuda">{servicios.length} {servicios.length === 1 ? 'servicio programado' : 'servicios programados'}</p>
    {servicios.length >= 2 && <p className="disponibilidad-aviso agenda-sobrecarga" role="status">
      Este técnico tiene {servicios.length} servicios presenciales programados para este día.
    </p>}
    {servicios.map((servicio) => <article key={servicio.id} className="disponibilidad-servicio">
      <strong>{tiposServicio[servicio.tipo]}</strong>
      <span>{servicio.cliente_nombre}</span><span>{servicio.maquina}</span>
      <EstadoServicio estado={servicio.estado} />
      <Link to={`/servicios/${servicio.id}`}>Ver servicio</Link>
    </article>)}
  </section>;
}
