import type { Tecnico } from "../services/tecnicosService";

type Props = {
  tecnico: Tecnico;
};

const bloques = [
  "Skills",
  "Disponibilidad",
  "Servicios",
  "Instalaciones",
  "Agenda",
  "Pagos",
];

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
        {bloques.map((bloque) => (
          <div className="technician-detail-section" key={bloque}>
            <strong>{bloque}</strong>
            <span>Próximamente</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default DetalleTecnico;
