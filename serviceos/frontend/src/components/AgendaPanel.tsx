import { Link } from 'react-router-dom';
import type { InicioOperacion } from '../services/agendaService';
import { estadosServicio, tiposServicio } from './servicios/serviciosAyudas';
import { enlaceAgendaServicio } from './operacion/agendaAyudas';

function AgendaPanel({ datos }: { datos: InicioOperacion }) {
  return (
    <article className="panel agenda-panel">
      <div className="panel-header">
        <div>
          <span>Agenda</span>
          <h2>Servicios de hoy</h2>
        </div>

        <Link to="/agenda" className="secondary-button">
          Ver agenda
        </Link>
      </div>

      <div className="service-list">
        {!datos.servicios.length && <p>Hoy no hay servicios programados.</p>}
        {datos.servicios.map((servicio) => (
          <Link
            className="service-row"
            key={servicio.id} to={enlaceAgendaServicio(servicio)}
          >
            <div className="service-info">
              <strong>{servicio.cliente_nombre}</strong>

              <span>
                {tiposServicio[servicio.tipo]} · {servicio.tecnico_nombre} · {servicio.ciudad ?? 'REMOTO'}
              </span>
            </div>

            <span className={`status ${servicio.estado}`}>
              {estadosServicio[servicio.estado]}
            </span>
          </Link>
        ))}
      </div>
      {datos.resumen.servicios_hoy > datos.servicios.length && <Link className="secondary-button" to={`/servicios?mes=${datos.hoy.slice(0, 7)}`}>Ver todos los servicios</Link>}
    </article>
  )
}

export default AgendaPanel
