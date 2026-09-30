import {
  Bell,
  ChevronDown,
} from 'lucide-react'

function Topbar() {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Panel de coordinación</p>
        <h1>Resumen operativo</h1>
        <span className="topbar-date">Hoy</span>
      </div>

      <div className="topbar-actions">
        <button className="icon-button">
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        <div className="user">
          <div className="avatar">C</div>

          <div className="user-data">
            <strong>Coordinador</strong>
            <span>Administrador</span>
          </div>

          <ChevronDown size={17} />
        </div>
      </div>
    </header>
  )
}

export default Topbar