import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import {
  cerrarSesion,
  obtenerSesion,
  type UsuarioSesion,
} from "../services/authService";

import "../styles/tecnicoInicio.css";

function TecnicoInicioPage() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    obtenerSesion()
      .then(setUsuario)
      .catch(() => {
        navigate("/login", {
          replace: true,
        });
      });
  }, [navigate]);

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

  return (
    <main className="tecnico-page">
      <section className="tecnico-card">
        <div className="tecnico-avatar">
          {usuario?.nombre.trim().charAt(0).toUpperCase() ?? "T"}
        </div>

        <p className="tecnico-eyebrow">ServiceOS</p>

        <h1>Hola, {usuario?.nombre ?? "Técnico"}</h1>

        <p className="tecnico-description">
          Tu cuenta funciona correctamente. El espacio de trabajo para técnicos
          se construirá en las siguientes etapas de ServiceOS.
        </p>

        <div className="tecnico-role">Técnico</div>

        <button
          type="button"
          className="tecnico-logout"
          onClick={manejarSalir}
          disabled={cerrando}
        >
          <LogOut size={18} />

          {cerrando ? "Saliendo..." : "Cerrar sesión"}
        </button>
      </section>
    </main>
  );
}

export default TecnicoInicioPage;
