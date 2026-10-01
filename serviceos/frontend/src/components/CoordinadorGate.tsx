import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { obtenerSesion } from "../services/authService";

type Estado = "cargando" | "coordinador" | "tecnico" | "sin-sesion";

function CoordinadorGate() {
  const [estado, setEstado] = useState<Estado>("cargando");

  useEffect(() => {
    obtenerSesion()
      .then((usuario) => {
        if (!usuario) {
          setEstado("sin-sesion");
          return;
        }

        setEstado(usuario.rol === "coordinador" ? "coordinador" : "tecnico");
      })
      .catch(() => {
        setEstado("sin-sesion");
      });
  }, []);

  if (estado === "cargando") {
    return <div className="auth-loading">Comprobando permisos...</div>;
  }

  if (estado === "sin-sesion") {
    return <Navigate to="/login" replace />;
  }

  if (estado === "tecnico") {
    return <Navigate to="/tecnico" replace />;
  }

  return <Outlet />;
}

export default CoordinadorGate;
