import {
  Navigate,
  Outlet,
} from 'react-router-dom'
import {
  useEffect,
  useState,
} from 'react'
import { obtenerSesion } from '../services/authService'

type EstadoSesion =
  | 'cargando'
  | 'autenticado'
  | 'sin-sesion'

export default function AuthGate() {
  const [estado, setEstado] = useState<EstadoSesion>(
    'cargando',
  )

  useEffect(() => {
    obtenerSesion()
      .then((usuario) => {
        setEstado(
          usuario
            ? 'autenticado'
            : 'sin-sesion',
        )
      })
      .catch(() => {
        setEstado('sin-sesion')
      })
  }, [])

  if (estado === 'cargando') {
    return (
      <div className="auth-loading">
        Comprobando sesión...
      </div>
    )
  }

  if (estado === 'sin-sesion') {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <Outlet />
}