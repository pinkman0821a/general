import { ChevronRight } from "lucide-react";
import type { Tecnico } from "../services/tecnicosService";

type Props = {
  tecnico: Tecnico;
  seleccionado: boolean;
  seleccionar: () => void;
};

function TarjetaTecnico({ tecnico, seleccionado, seleccionar }: Props) {
  return (
    <button
      type="button"
      className={seleccionado ? "technician-card selected" : "technician-card"}
      onClick={seleccionar}
    >
      <div className="technician-card-avatar">
        {tecnico.nombre.charAt(0).toUpperCase()}
      </div>

      <div className="technician-card-data">
        <strong>{tecnico.nombre}</strong>
        <span>@{tecnico.user}</span>
      </div>

      <span
        className={
          tecnico.activo ? "technician-status active" : "technician-status"
        }
      >
        {tecnico.activo ? "Activo" : "Inactivo"}
      </span>

      <ChevronRight size={18} />
    </button>
  );
}

export default TarjetaTecnico;
