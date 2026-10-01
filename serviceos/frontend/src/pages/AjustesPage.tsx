import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import UsuariosAjustes from "../components/UsuariosAjustes";
import { obtenerSesion, type UsuarioSesion } from "../services/authService";
import {
  actualizarNombreCoordinador,
  cambiarPasswordCoordinador,
} from "../services/coordinadorService";

function AjustesPage() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  const [mensajeNombre, setMensajeNombre] = useState("");
  const [errorNombre, setErrorNombre] = useState("");
  const [errorPassword, setErrorPassword] = useState("");

  useEffect(() => {
    obtenerSesion()
      .then((sesion) => {
        setUsuario(sesion);
        setNombre(sesion?.nombre ?? "");
      })
      .catch(() => {
        setErrorNombre("No se pudo cargar la sesión");
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);

  async function guardarNombre(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setErrorNombre("El nombre es obligatorio");
      return;
    }

    setGuardandoNombre(true);
    setErrorNombre("");
    setMensajeNombre("");

    try {
      const actualizado = await actualizarNombreCoordinador(nombreLimpio);

      setUsuario(actualizado);
      setNombre(actualizado.nombre);
      setMensajeNombre("Nombre actualizado correctamente");
    } catch (errorActualizacion) {
      setErrorNombre(
        errorActualizacion instanceof Error
          ? errorActualizacion.message
          : "No se pudo guardar el nombre",
      );
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function guardarPassword(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setErrorPassword("");

    if (passwordNueva.length < 8) {
      setErrorPassword("La nueva contraseña debe tener mínimo 8 caracteres");
      return;
    }

    if (passwordNueva !== confirmarPassword) {
      setErrorPassword("Las contraseñas nuevas no coinciden");
      return;
    }

    setGuardandoPassword(true);

    try {
      await cambiarPasswordCoordinador(passwordActual, passwordNueva);

      navigate("/login", {
        replace: true,
      });
    } catch (errorCambio) {
      setErrorPassword(
        errorCambio instanceof Error
          ? errorCambio.message
          : "No se pudo cambiar la contraseña",
      );
    } finally {
      setGuardandoPassword(false);
    }
  }

  if (cargando) {
    return (
      <section className="page-section">
        <p>Cargando ajustes...</p>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Configuración</p>

          <h2>Ajustes</h2>

          <p>Configura los datos generales de ServiceOS.</p>
        </div>
      </div>

      {usuario?.rol === "coordinador" ? (
        <div className="settings-grid">
          <article className="settings-card">
            <div className="settings-card-heading">
              <h3>Coordinador</h3>

              <p>Datos de la persona responsable de coordinación.</p>
            </div>

            <form className="settings-form" onSubmit={guardarNombre}>
              <label>
                Nombre del coordinador
                <input
                  type="text"
                  value={nombre}
                  onChange={(evento) => {
                    setNombre(evento.target.value);
                  }}
                  maxLength={80}
                  required
                />
              </label>

              <label>
                Usuario
                <input type="text" value={usuario.user} disabled />
              </label>

              <p className="settings-help">
                El usuario permanece fijo aunque cambie la persona encargada.
              </p>

              {mensajeNombre && (
                <p className="settings-success">{mensajeNombre}</p>
              )}

              {errorNombre && <p className="settings-error">{errorNombre}</p>}

              <button type="submit" disabled={guardandoNombre}>
                {guardandoNombre ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </article>

          <article className="settings-card">
            <div className="settings-card-heading">
              <h3>Seguridad</h3>

              <p>Cambia la contraseña de acceso del coordinador.</p>
            </div>

            <form className="settings-form" onSubmit={guardarPassword}>
              <label>
                Contraseña actual
                <input
                  type="password"
                  value={passwordActual}
                  onChange={(evento) => {
                    setPasswordActual(evento.target.value);
                  }}
                  autoComplete="current-password"
                  required
                />
              </label>

              <label>
                Nueva contraseña
                <input
                  type="password"
                  value={passwordNueva}
                  onChange={(evento) => {
                    setPasswordNueva(evento.target.value);
                  }}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <label>
                Confirmar nueva contraseña
                <input
                  type="password"
                  value={confirmarPassword}
                  onChange={(evento) => {
                    setConfirmarPassword(evento.target.value);
                  }}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <p className="settings-help">
                Al cambiar la contraseña se cerrarán todas las sesiones
                abiertas.
              </p>

              {errorPassword && (
                <p className="settings-error">{errorPassword}</p>
              )}

              <button type="submit" disabled={guardandoPassword}>
                {guardandoPassword ? "Cambiando..." : "Cambiar contraseña"}
              </button>
            </form>
          </article>

          <UsuariosAjustes />
        </div>
      ) : (
        <p className="settings-warning">
          Solo el coordinador puede modificar estos ajustes.
        </p>
      )}
    </section>
  );
}

export default AjustesPage;
