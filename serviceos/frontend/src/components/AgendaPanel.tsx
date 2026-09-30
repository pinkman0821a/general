import { servicios } from '../data/dashboardData'

function AgendaPanel() {
  return (
    <article className="panel agenda-panel">
      <div className="panel-header">
        <div>
          <span>Agenda</span>
          <h2>Servicios de hoy</h2>
        </div>

        <button className="secondary-button">
          Ver agenda
        </button>
      </div>

      <div className="service-list">
        {servicios.map((servicio) => (
          <div
            className="service-row"
            key={`${servicio.hora}-${servicio.cliente}`}
          >
            <span className="service-time">
              {servicio.hora}
            </span>

            <div className="service-info">
              <strong>{servicio.cliente}</strong>

              <span>
                {servicio.tipo} · {servicio.tecnico}
              </span>
            </div>

            <span className="status pending">
              Programado
            </span>
          </div>
        ))}
      </div>
    </article>
  )
}

export default AgendaPanel