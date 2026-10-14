import { Link } from 'react-router-dom';
import type { TecnicoDia } from '../services/agendaService';
import { descripcionTecnico, estadosAgenda } from './operacion/agendaAyudas';

function TechniciansPanel({ tecnicos }: { tecnicos: TecnicoDia[] }) {
  return (
    <article className="panel technician-panel">
      <div className="panel-header">
        <div>
          <span>Equipo</span>
          <h2>Estado de técnicos</h2>
        </div>
      </div>

      <div className="technician-list">
        {!tecnicos.length && <p>No hay técnicos activos.</p>}
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
              <span>{descripcionTecnico(tecnico)}</span>
              {!!tecnico.remotos.length && <span>{tecnico.remotos.length} remoto{tecnico.remotos.length > 1 ? 's' : ''} · no ocupa agenda</span>}
            </div>

            <span className={`availability agenda-estado ${tecnico.estado}`}>
              {tecnico.estado === 'programado' ? 'En servicio' : estadosAgenda[tecnico.estado]}
            </span>
          </div>
        ))}
      </div>
      <Link to="/agenda" className="secondary-button">Consultar agenda</Link>
    </article>
  )
}

export default TechniciansPanel
