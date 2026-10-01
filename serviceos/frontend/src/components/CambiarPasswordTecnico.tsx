import { type FormEvent, useState } from "react";

import {
  cambiarPasswordTecnico,
  type UsuarioSistema,
} from "../services/usuariosService";

type Props = {
  usuario: UsuarioSistema;
  cerrar: () => void;
  completado: (mensaje: string) => void;
};

function CambiarPasswordTecnico({ usuario, cerrar, completado }: Props) {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener mínimo 8 caracteres");
      return;
    }

    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setGuardando(true);

    try {
      await cambiarPasswordTecnico(usuario.id, password);

      completado(`Contraseña de ${usuario.nombre} actualizada`);

      cerrar();
    } catch (errorCambio) {
      setError(
        errorCambio instanceof Error
          ? errorCambio.message
          : "No se pudo cambiar la contraseña",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="technician-password-form" onSubmit={guardar}>
      <div className="technician-password-heading">
        <div>
          <strong>Cambiar contraseña</strong>

          <span>{usuario.nombre}</span>
        </div>

        <button type="button" onClick={cerrar}>
          Cancelar
        </button>
      </div>

      <label>
        Nueva contraseña
        <input
          type="password"
          value={password}
          onChange={(evento) => {
            setPassword(evento.target.value);
          }}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </label>

      <label>
        Confirmar contraseña
        <input
          type="password"
          value={confirmacion}
          onChange={(evento) => {
            setConfirmacion(evento.target.value);
          }}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </label>

      <p className="settings-help">
        Al guardar se cerrarán las sesiones abiertas de este técnico.
      </p>

      {error && <p className="settings-error">{error}</p>}

      <button
        className="technician-password-save"
        type="submit"
        disabled={guardando}
      >
        {guardando ? "Guardando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}

export default CambiarPasswordTecnico;
