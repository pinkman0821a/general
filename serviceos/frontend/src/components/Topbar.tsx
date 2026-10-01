import {
  Bell,
  LogOut,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import {
  cerrarSesion,
  obtenerSesion,
  type UsuarioSesion,
} from '../services/authService'
import ApiStatus from './ApiStatus'

function Topbar() {
  const navigate = useNavigate()

  const [usuario, setUsuario] =
    useState<UsuarioSesion | null>(null)

  const [cerrando, setCerrando] =
    useState(false)

  useEffect(() => {
    obtenerSesion()
      .then(setUsuario)
      .catch(() => {
        setUsuario(null)
      })
  }, [])

  async function manejarCerrarSesion() {
    setCerrando(true)

    try {
      await cerrarSesion()

      navigate('/login', {
        replace: true,
      })
    } finally {
      setCerrando(false)
    }
  }

  const inicial = usuario?.nombre
    .trim()
    .charAt(0)
    .toUpperCase() ?? 'U'

  const nombreRol =
    usuario?.rol === 'coordinador'
      ? 'Coordinador'
      : 'Técnico'

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">
          Panel de coordinación
        </p>

        <h1>Resumen operativo</h1>

        <span className="topbar-date">
          Hoy
        </span>
      </div>

      <div className="topbar-actions">
        <ApiStatus />

        <button
          className="icon-button"
          type="button"
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        <div className="user">
          <div className="avatar">
            {inicial}
          </div>

          <div className="user-data">
            <strong>
              {usuario?.nombre ?? 'Usuario'}
            </strong>

            <span>
              {usuario
                ? nombreRol
                : 'Cargando...'}
            </span>
          </div>

          <button
            className="logout-button"
            type="button"
            onClick={manejarCerrarSesion}
            disabled={cerrando}
            title="Cerrar sesión"
          >
            <LogOut size={18} />

            <span>
              {cerrando
                ? 'Saliendo...'
                : 'Salir'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Topbar