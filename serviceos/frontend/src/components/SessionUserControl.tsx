import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  cerrarSesion,
  obtenerSesion,
  type UsuarioSesion,
} from "../services/authService";

function SessionUserControl() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    obtenerSesion()
      .then(setUsuario)
      .catch(() => {
        setUsuario(null);
      });
  }, []);

  async function manejarSalir() {
    setCerrando(true);

    try {
      await cerrarSesion();

      navigate("/login", {
        replace: true,
      });
    } finally {
      setCerrando(false);
    }
  }

  if (!usuario) {
    return null;
  }

  const inicial = usuario.nombre.trim().charAt(0).toUpperCase();

  const rol = usuario.rol === "coordinador" ? "Coordinador" : "Técnico";

  return (
    <div className="session-user">
      <div className="session-user-avatar">{inicial}</div>

      <div className="session-user-data">
        <strong>{usuario.nombre}</strong>

        <span>{rol}</span>
      </div>

      <button
        type="button"
        className="session-user-logout"
        onClick={manejarSalir}
        disabled={cerrando}
        title="Cerrar sesión"
      >
        <LogOut size={17} />

        <span>{cerrando ? "Saliendo..." : "Salir"}</span>
      </button>
    </div>
  );
}

export default SessionUserControl;
