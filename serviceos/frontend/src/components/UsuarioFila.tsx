import type { UsuarioSistema } from "../services/usuariosService";

type Props = {
  usuario: UsuarioSistema;
  procesando: boolean;
  editar: () => void;
  cambiarPassword: () => void;
  cambiarEstado: () => void;
};

function UsuarioFila({
  usuario,
  procesando,
  editar,
  cambiarPassword,
  cambiarEstado,
}: Props) {
  return (
    <div className="user-row">
      <div className="user-row-avatar">
        {usuario.nombre.charAt(0).toUpperCase()}
      </div>

      <div className="user-row-data">
        <strong>{usuario.nombre}</strong>

        <span>@{usuario.user}</span>
      </div>

      <div className="user-row-meta">
        <span className="user-role">
          {usuario.rol === "coordinador" ? "Coordinador" : "Técnico"}
        </span>

        <span className={usuario.activo ? "user-status active" : "user-status"}>
          {usuario.activo ? "Activo" : "Inactivo"}
        </span>

        {usuario.rol === "tecnico" && (
          <>
            <button
              type="button"
              className="user-state-button"
              onClick={editar}
            >
              Editar
            </button>

            <button
              type="button"
              className="user-state-button"
              onClick={cambiarPassword}
            >
              Contraseña
            </button>

            <button
              type="button"
              className={
                usuario.activo
                  ? "user-state-button danger"
                  : "user-state-button"
              }
              onClick={cambiarEstado}
              disabled={procesando}
            >
              {procesando
                ? "Procesando..."
                : usuario.activo
                  ? "Desactivar"
                  : "Activar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default UsuarioFila;
