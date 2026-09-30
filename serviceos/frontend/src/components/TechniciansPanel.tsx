import { tecnicos } from '../data/dashboardData'

function TechniciansPanel() {
  return (
    <article className="panel technician-panel">
      <div className="panel-header">
        <div>
          <span>Equipo</span>
          <h2>Estado de técnicos</h2>
        </div>
      </div>

      <div className="technician-list">
        {tecnicos.map((tecnico) => (
          <div
            className="technician"
            key={tecnico.nombre}
          >
            <div className="technician-avatar">
              {tecnico.nombre.charAt(0)}
            </div>

            <div className="technician-info">
              <strong>{tecnico.nombre}</strong>
              <span>{tecnico.ciudad}</span>
            </div>

            <span
              className={
                tecnico.estado === 'Disponible'
                  ? 'availability available'
                  : 'availability busy'
              }
            >
              {tecnico.estado}
            </span>
          </div>
        ))}
      </div>
    </article>
  )
}

export default TechniciansPanel