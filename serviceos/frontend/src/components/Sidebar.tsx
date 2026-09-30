import {
  CircleDollarSign,
  Settings,
} from 'lucide-react'

import { menuPrincipal } from '../data/dashboardData'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Settings size={24} />
        </div>

        <div>
          <strong>
            Service<span>OS</span>
          </strong>
          <small>Panel de coordinación</small>
        </div>
      </div>

      <nav className="nav">
        {menuPrincipal.map((item) => {
          const Icono = item.icono

          return (
            <button
              className={`nav-item ${item.activo ? 'active' : ''}`}
              key={item.nombre}
            >
              <Icono size={19} strokeWidth={1.8} />
              <span>{item.nombre}</span>
            </button>
          )
        })}
      </nav>

      <button className="nav-item settings-item">
        <Settings size={19} strokeWidth={1.8} />
        <span>Ajustes</span>
      </button>

      <div className="sidebar-footer">
        <CircleDollarSign size={19} />

        <div>
          <span>ServiceOS</span>
          <strong>v0.0.1</strong>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar