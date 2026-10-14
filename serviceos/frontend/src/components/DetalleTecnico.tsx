import type { Tecnico } from "../services/tecnicosService";
import TecnicoSkills from "./TecnicoSkills";
import TecnicoDisponibilidad from "./TecnicoDisponibilidad";

type Props = {
  tecnico: Tecnico;
};

function DetalleTecnico({ tecnico }: Props) {
  const fechaCreacion = new Date(tecnico.created_at).toLocaleDateString(
    "es-CO",
  );

  return (
    <section className="technician-detail">
      <div className="technician-detail-header">
        <div className="technician-detail-avatar">
          {tecnico.nombre.charAt(0).toUpperCase()}
        </div>

        <div>
          <h2>{tecnico.nombre}</h2>
          <span>@{tecnico.user}</span>
        </div>
      </div>

      <div className="technician-detail-info">
        <div>
          <span>Estado</span>

          <strong>{tecnico.activo ? "Activo" : "Inactivo"}</strong>
        </div>

        <div>
          <span>Cuenta creada</span>

          <strong>{fechaCreacion}</strong>
        </div>
      </div>

      <div className="technician-detail-sections">
        <TecnicoSkills key={`skills-${tecnico.id}`} tecnicoId={tecnico.id} />
        <TecnicoDisponibilidad key={`disponibilidad-${tecnico.id}`} tecnicoId={tecnico.id} />
      </div>
    </section>
  );
}

export default DetalleTecnico;
