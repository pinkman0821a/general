import { type FormEvent, useEffect, useState } from "react";

import CambiarPasswordTecnico from "./CambiarPasswordTecnico";
import EditarTecnico from "./EditarTecnico";
import UsuarioFila from "./UsuarioFila";

import {
  cambiarEstadoTecnico,
  crearTecnico,
  listarUsuarios,
  type UsuarioSistema,
} from "../services/usuariosService";

function UsuariosAjustes() {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);

  const [nombre, setNombre] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");

  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);

  const [usuarioProcesando, setUsuarioProcesando] = useState<number | null>(
    null,
  );

  const [usuarioPassword, setUsuarioPassword] = useState<UsuarioSistema | null>(
    null,
  );

  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioSistema | null>(
    null,
  );

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarUsuariosIniciales() {
      try {
        const lista = await listarUsuarios();

        setUsuarios(lista);
      } catch (errorCarga) {
        setError(
          errorCarga instanceof Error
            ? errorCarga.message
            : "No se pudieron cargar los usuarios",
        );
      } finally {
        setCargando(false);
      }
    }

    cargarUsuariosIniciales();
  }, []);

  async function guardarTecnico(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const nombreLimpio = nombre.trim();
    const usuarioLimpio = user.trim().toLowerCase();

    if (!nombreLimpio || !usuarioLimpio || !password) {
      setError("Debes completar todos los campos");
      return;
    }

    setCreando(true);
    setError("");
    setMensaje("");

    try {
      const nuevo = await crearTecnico(nombreLimpio, usuarioLimpio, password);

      setUsuarios((actuales) => [...actuales, nuevo]);

      setNombre("");
      setUser("");
      setPassword("");
      setMostrarFormulario(false);

      setMensaje(`${nuevo.nombre} creado correctamente`);
    } catch (errorCreacion) {
      setError(
        errorCreacion instanceof Error
          ? errorCreacion.message
          : "No se pudo crear el técnico",
      );
    } finally {
      setCreando(false);
    }
  }

  async function cambiarEstado(usuario: UsuarioSistema) {
    if (usuario.rol !== "tecnico") {
      return;
    }

    setUsuarioProcesando(usuario.id);
    setError("");
    setMensaje("");

    try {
      const actualizado = await cambiarEstadoTecnico(
        usuario.id,
        !usuario.activo,
      );

      actualizarLista(actualizado);

      setMensaje(
        `${actualizado.nombre} ${
          actualizado.activo ? "activado" : "desactivado"
        } correctamente`,
      );
    } catch (errorCambio) {
      setError(
        errorCambio instanceof Error
          ? errorCambio.message
          : "No se pudo cambiar el estado",
      );
    } finally {
      setUsuarioProcesando(null);
    }
  }

  function actualizarLista(actualizado: UsuarioSistema) {
    setUsuarios((actuales) =>
      actuales.map((usuario) =>
        usuario.id === actualizado.id ? actualizado : usuario,
      ),
    );
  }

  function cerrarFormularios() {
    setMostrarFormulario(false);
    setUsuarioPassword(null);
    setUsuarioEditando(null);
    setError("");
    setMensaje("");
  }

  return (
    <article className="settings-card">
      <div className="settings-card-heading">
        <h3>Usuarios</h3>

        <p>Administra las cuentas que pueden entrar a ServiceOS.</p>
      </div>

      <div className="users-toolbar">
        <span>
          {usuarios.length} cuenta
          {usuarios.length === 1 ? "" : "s"}
        </span>

        <button
          type="button"
          onClick={() => {
            const abrir = !mostrarFormulario;

            cerrarFormularios();
            setMostrarFormulario(abrir);
          }}
        >
          {mostrarFormulario ? "Cancelar" : "+ Nuevo técnico"}
        </button>
      </div>

      {mostrarFormulario && (
        <form
          className="settings-form user-create-form"
          onSubmit={guardarTecnico}
        >
          <label>
            Nombre
            <input
              type="text"
              value={nombre}
              onChange={(evento) => {
                setNombre(evento.target.value);
              }}
              maxLength={80}
              placeholder="Ej: Andrés López"
              required
            />
          </label>

          <label>
            Usuario
            <input
              type="text"
              value={user}
              onChange={(evento) => {
                setUser(evento.target.value);
              }}
              maxLength={40}
              placeholder="Ej: andres"
              required
            />
          </label>

          <label>
            Contraseña temporal
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

          <button type="submit" disabled={creando}>
            {creando ? "Creando..." : "Crear técnico"}
          </button>
        </form>
      )}

      {usuarioEditando && (
        <EditarTecnico
          usuario={usuarioEditando}
          cerrar={() => {
            setUsuarioEditando(null);
          }}
          actualizado={(actualizado, texto) => {
            actualizarLista(actualizado);
            setMensaje(texto);
            setError("");
          }}
        />
      )}

      {usuarioPassword && (
        <CambiarPasswordTecnico
          usuario={usuarioPassword}
          cerrar={() => {
            setUsuarioPassword(null);
          }}
          completado={(texto) => {
            setMensaje(texto);
            setError("");
          }}
        />
      )}

      {mensaje && <p className="settings-success users-message">{mensaje}</p>}

      {error && <p className="settings-error users-message">{error}</p>}

      {cargando ? (
        <p className="users-empty">Cargando usuarios...</p>
      ) : (
        <div className="users-list">
          {usuarios.map((usuario) => (
            <UsuarioFila
              key={usuario.id}
              usuario={usuario}
              procesando={usuarioProcesando === usuario.id}
              editar={() => {
                cerrarFormularios();
                setUsuarioEditando(usuario);
              }}
              cambiarPassword={() => {
                cerrarFormularios();
                setUsuarioPassword(usuario);
              }}
              cambiarEstado={() => {
                cambiarEstado(usuario);
              }}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export default UsuariosAjustes;
