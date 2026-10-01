import {
  type FormEvent,
  useState,
} from 'react'

import {
  actualizarTecnico,
  type UsuarioSistema,
} from '../services/usuariosService'

type Props = {
  usuario: UsuarioSistema
  cerrar: () => void
  actualizado: (
    usuario: UsuarioSistema,
    mensaje: string,
  ) => void
}

function EditarTecnico({
  usuario,
  cerrar,
  actualizado,
}: Props) {
  const [nombre, setNombre] =
    useState(usuario.nombre)

  const [user, setUser] =
    useState(usuario.user)

  const [guardando, setGuardando] =
    useState(false)

  const [error, setError] =
    useState('')

  async function guardar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault()

    const nombreLimpio = nombre.trim()
    const usuarioLimpio = user
      .trim()
      .toLowerCase()

    if (!nombreLimpio || !usuarioLimpio) {
      setError(
        'Debes completar todos los campos',
      )
      return
    }

    setGuardando(true)
    setError('')

    try {
      const resultado =
        await actualizarTecnico(
          usuario.id,
          nombreLimpio,
          usuarioLimpio,
        )

      actualizado(
        resultado,
        `${resultado.nombre} actualizado correctamente`,
      )

      cerrar()
    } catch (errorActualizacion) {
      setError(
        errorActualizacion instanceof Error
          ? errorActualizacion.message
          : 'No se pudo actualizar el técnico',
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form
      className="technician-edit-form"
      onSubmit={guardar}
    >
      <div className="technician-form-heading">
        <div>
          <strong>
            Editar técnico
          </strong>

          <span>
            {usuario.nombre}
          </span>
        </div>

        <button
          type="button"
          onClick={cerrar}
        >
          Cancelar
        </button>
      </div>

      <label>
        Nombre

        <input
          type="text"
          value={nombre}
          onChange={(evento) => {
            setNombre(evento.target.value)
          }}
          maxLength={80}
          required
        />
      </label>

      <label>
        Usuario

        <input
          type="text"
          value={user}
          onChange={(evento) => {
            setUser(evento.target.value)
          }}
          maxLength={40}
          required
        />
      </label>

      {error && (
        <p className="settings-error">
          {error}
        </p>
      )}

      <button
        className="technician-edit-save"
        type="submit"
        disabled={guardando}
      >
        {guardando
          ? 'Guardando...'
          : 'Guardar cambios'}
      </button>
    </form>
  )
}

export default EditarTecnico