import { Plus, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useTecnicoSkills } from "./useTecnicoSkills";
import "../styles/tecnicoSkills.css";

type Props = { tecnicoId: number };

function TecnicoSkills({ tecnicoId }: Props) {
  const estado = useTecnicoSkills(tecnicoId);
  const [agregando, setAgregando] = useState(false);
  const [nombre, setNombre] = useState("");
  const id = useId();
  const ocupado = Boolean(estado.operacion);
  const catalogoBloqueado = ocupado || estado.cargandoCatalogo || Boolean(estado.errorCatalogo);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (await estado.crear(nombre)) setNombre("");
  }

  return (
    <section className="tecnico-skills" aria-labelledby={`${id}-titulo`} aria-busy={estado.cargando || ocupado}>
      <div className="tecnico-skills-heading">
        <h3 id={`${id}-titulo`}>Skills</h3>
        <button
          type="button"
          disabled={estado.cargando || Boolean(estado.errorCarga) || ocupado}
          aria-expanded={agregando}
          aria-controls={`${id}-agregar`}
          onClick={() => setAgregando(!agregando)}
        >
          {agregando ? <X size={14} /> : <Plus size={14} />}
          {agregando ? "Cerrar" : "Agregar skill"}
        </button>
      </div>

      {estado.cargando ? (
        <p className="tecnico-skills-status" role="status">Cargando skills...</p>
      ) : estado.errorCarga ? (
        <div className="tecnico-skills-feedback">
          <p className="tecnico-skills-error" role="alert">{estado.errorCarga}</p>
          <button type="button" onClick={estado.reintentar} disabled={ocupado}>Reintentar</button>
        </div>
      ) : estado.skills.length === 0 ? (
        <p className="tecnico-skills-status">Sin skills asignadas.</p>
      ) : (
        <ul className="tecnico-skills-list">
          {estado.skills.map((skill) => (
            <li key={skill.id}>
              <span>{skill.nombre}</span>
              <button
                type="button"
                aria-label={`Quitar ${skill.nombre}`}
                title={`Quitar ${skill.nombre}`}
                disabled={ocupado}
                onClick={() => { void estado.quitar(skill.id); }}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {agregando && !estado.cargando && !estado.errorCarga && (
        <div id={`${id}-agregar`} className="tecnico-skills-editor">
          {estado.cargandoCatalogo ? (
            <p className="tecnico-skills-status" role="status">Cargando catálogo...</p>
          ) : estado.errorCatalogo ? (
            <div className="tecnico-skills-feedback">
              <p className="tecnico-skills-error" role="alert">{estado.errorCatalogo}</p>
              <button type="button" onClick={estado.reintentar} disabled={ocupado}>Reintentar</button>
            </div>
          ) : (
            <form onSubmit={(evento) => { evento.preventDefault(); void estado.asignar(); }}>
              <label htmlFor={`${id}-catalogo`}>Skill del catálogo</label>
              {estado.disponibles.length > 0 ? (
                <div className="tecnico-skills-row">
                  <select
                    id={`${id}-catalogo`}
                    value={estado.seleccion}
                    disabled={ocupado}
                    onChange={(evento) => estado.setSeleccion(evento.target.value)}
                    required
                  >
                    <option value="">Seleccionar skill</option>
                    {estado.disponibles.map((skill) => (
                      <option key={skill.id} value={skill.id}>{skill.nombre}</option>
                    ))}
                  </select>
                  <button type="submit" disabled={ocupado || !estado.seleccion}>Asignar</button>
                </div>
              ) : (
                <p className="tecnico-skills-status">No hay skills disponibles para asignar.</p>
              )}
            </form>
          )}

          <form onSubmit={crear}>
            <label htmlFor={`${id}-nombre`}>¿No existe? Crea una skill</label>
            <div className="tecnico-skills-row">
              <input
                id={`${id}-nombre`}
                value={nombre}
                placeholder="Nombre de la skill"
                disabled={catalogoBloqueado}
                onChange={(evento) => setNombre(evento.target.value)}
                required
              />
              <button type="submit" disabled={catalogoBloqueado || !nombre.trim()}>Crear</button>
            </div>
            <p className="tecnico-skills-hint">Al crearla, quedará seleccionada para asignarla.</p>
          </form>
        </div>
      )}

      {estado.errorOperacion && <p className="tecnico-skills-error" role="alert">{estado.errorOperacion}</p>}
      {ocupado && <p className="tecnico-skills-status" role="status">{estado.operacion}</p>}
    </section>
  );
}

export default TecnicoSkills;
