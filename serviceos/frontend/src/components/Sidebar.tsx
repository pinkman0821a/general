import {
  CircleDollarSign,
  Settings,
} from 'lucide-react'

import { NavLink } from 'react-router-dom'

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
            <NavLink
              to={item.ruta}
              key={item.nombre}
              end={item.ruta === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icono size={19} strokeWidth={1.8} />
              <span>{item.nombre}</span>
            </NavLink>
          )
        })}
      </nav>

      <NavLink
        to="/ajustes"
        className={({ isActive }) =>
          `nav-item settings-item ${
            isActive ? 'active' : ''
          }`
        }
      >
        <Settings size={19} strokeWidth={1.8} />
        <span>Ajustes</span>
      </NavLink>

      <div className="sidebar-footer">
        <CircleDollarSign size={19} />

        <div>
          <span>ServiceOS</span>
          <strong>v0.0.6</strong>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar