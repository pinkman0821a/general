import SessionUserControl from '../components/SessionUserControl'
import {
  obtenerSesion,
  type UsuarioSesion,
} from '../services/authService'

import {
  useEffect,
  useState,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'

import '../styles/tecnicoInicio.css'

function TecnicoInicioPage() {
  const navigate = useNavigate()

  const [usuario, setUsuario] =
    useState<UsuarioSesion | null>(null)

  useEffect(() => {
    obtenerSesion()
      .then((sesion) => {
        if (!sesion) {
          navigate('/login', {
            replace: true,
          })

          return
        }

        setUsuario(sesion)
      })
      .catch(() => {
        navigate('/login', {
          replace: true,
        })
      })
  }, [navigate])

  return (
    <main className="tecnico-page">
      <header className="tecnico-topbar">
        <div className="tecnico-brand">
          <strong>ServiceOS</strong>
          <span>Panel técnico</span>
        </div>

        <SessionUserControl />
      </header>

      <section className="tecnico-content">
        <div className="tecnico-card">
          <div className="tecnico-avatar">
            {usuario?.nombre
              .trim()
              .charAt(0)
              .toUpperCase() ?? 'T'}
          </div>

          <p className="tecnico-eyebrow">
            ServiceOS
          </p>

          <h1>
            Hola, {usuario?.nombre ?? 'Técnico'}
          </h1>

          <p className="tecnico-description">
            Tu cuenta funciona correctamente.
            El espacio de trabajo para técnicos
            se construirá en las siguientes etapas
            de ServiceOS.
          </p>

          <div className="tecnico-role">
            Técnico
          </div>
          <Link className="tecnico-taller-link" to="/maquinas">
            Taller · Recepción y entrega de equipos
          </Link>
        </div>
      </section>
    </main>
  )
}

export default TecnicoInicioPage
