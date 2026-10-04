import {
  type FormEvent,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { iniciarSesion } from '../services/authService'
import '../styles/login.css'

export default function LoginPage() {
  const navigate = useNavigate()

  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function manejarLogin(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault()

    setError('')
    setCargando(true)

    try {
const usuario = await iniciarSesion(
  user.trim(),
  password,
)

navigate(
  usuario.rol === 'coordinador'
    ? '/'
    : '/tecnico',
  {
    replace: true,
  },
)
    } catch (errorLogin) {
      setError(
        errorLogin instanceof Error
          ? errorLogin.message
          : 'No se pudo iniciar sesión',
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="login-logo">S</span>

          <div>
            <h1>ServiceOS</h1>
            <p>Gestión técnica</p>
          </div>
        </div>

        <div className="login-heading">
          <h2>Iniciar sesión</h2>
          <p>
            Ingresa con tu usuario para acceder
            al sistema.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={manejarLogin}
        >
          <label>
            Usuario

            <input
              type="text"
              value={user}
              onChange={(evento) => {
                setUser(evento.target.value)
              }}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Contraseña

            <input
              type="password"
              value={password}
              onChange={(evento) => {
                setPassword(evento.target.value)
              }}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
          >
            {cargando
              ? 'Ingresando...'
              : 'Ingresar'}
          </button>
        </form>

        <span className="login-version">
          ServiceOS v0.1.1
        </span>
      </section>
    </main>
  )
}