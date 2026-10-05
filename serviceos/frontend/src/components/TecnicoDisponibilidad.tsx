import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import { diasSemana, mostrarFecha } from "./calendarioDisponibilidad";
import { useTecnicoDisponibilidad } from "./useTecnicoDisponibilidad";
import "../styles/tecnicoDisponibilidad.css";

type Props = { tecnicoId: number };

function TecnicoDisponibilidad({ tecnicoId }: Props) {
  const estado = useTecnicoDisponibilidad(tecnicoId);
  const [motivo, setMotivo] = useState("");
  const id = useId();
  const marcada = estado.lista.find((item) => item.fecha === estado.seleccion);
  const excepciones = new Set(estado.lista.map((item) => item.fecha));

  function seleccionar(fecha: string) {
    estado.seleccionar(fecha);
    setMotivo("");
  }

  return (
    <section className="tecnico-disponibilidad" aria-labelledby={`${id}-titulo`} aria-busy={estado.cargando || estado.operacion}>
      <h3 id={`${id}-titulo`}>Disponibilidad</h3>
      <p className="disponibilidad-ayuda">Disponible por defecto. Selecciona un día para cambiarlo.</p>
      <div className="disponibilidad-contenido">
        <div className="disponibilidad-calendario">
          <div className="disponibilidad-mes">
            <button type="button" aria-label="Mes anterior" disabled={estado.operacion} onClick={() => estado.navegar(-1)}>
              <ChevronLeft size={16} />
            </button>
            <strong aria-live="polite">{estado.calendario.titulo}</strong>
            <button type="button" aria-label="Mes siguiente" disabled={estado.operacion} onClick={() => estado.navegar(1)}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="disponibilidad-cuadricula" role="group" aria-label={estado.calendario.titulo}>
            {diasSemana.map((dia) => <span className="disponibilidad-semana" key={dia}>{dia}</span>)}
            {estado.calendario.celdas.map((celda, indice) => celda ? (
              <button
                type="button"
                key={celda.fecha}
                className={`disponibilidad-dia${excepciones.has(celda.fecha) ? " no-disponible" : ""}`}
                disabled={estado.cargando || Boolean(estado.errorCarga) || estado.operacion}
                aria-pressed={estado.seleccion === celda.fecha}
                aria-label={`${mostrarFecha(celda.fecha)}: ${estado.cargando || estado.errorCarga ? "sin consultar" : excepciones.has(celda.fecha) ? "no disponible" : "disponible"}`}
                onClick={() => seleccionar(celda.fecha)}
              >
                {celda.dia}
                {excepciones.has(celda.fecha) && <span className="disponibilidad-marca" aria-hidden="true" />}
              </button>
            ) : <span key={`vacio-${indice}`} aria-hidden="true" />)}
          </div>
          <p className="disponibilidad-leyenda"><span className="disponibilidad-marca" /> No disponible</p>
        </div>

        <div className="disponibilidad-panel">
          {estado.cargando ? (
            <p className="disponibilidad-ayuda" role="status">Cargando disponibilidad...</p>
          ) : estado.errorCarga ? (
            <div>
              <p className="disponibilidad-error" role="alert">{estado.errorCarga}</p>
              <button type="button" onClick={estado.reintentar}>Reintentar</button>
            </div>
          ) : estado.seleccion ? (
            <form onSubmit={(evento) => { evento.preventDefault(); void estado.guardar(motivo); }}>
              <strong>{mostrarFecha(estado.seleccion)}</strong>
              {marcada ? (
                <>
                  <p className="disponibilidad-ayuda">No disponible</p>
                  {marcada.motivo && <p className="disponibilidad-motivo">{marcada.motivo}</p>}
                </>
              ) : (
                <>
                  <p className="disponibilidad-ayuda">Confirma que el técnico no estará disponible este día.</p>
                  <label htmlFor={`${id}-motivo`}>Motivo (opcional)</label>
                  <input id={`${id}-motivo`} value={motivo} disabled={estado.operacion} onChange={(evento) => setMotivo(evento.target.value)} />
                </>
              )}
              <div className="disponibilidad-acciones">
                <button type="submit" disabled={estado.operacion}>
                  {marcada ? "Marcar disponible" : "Marcar no disponible"}
                </button>
                <button type="button" disabled={estado.operacion} onClick={() => seleccionar("")}>Cancelar</button>
              </div>
              {estado.errorOperacion && <p className="disponibilidad-error" role="alert">{estado.errorOperacion} Puedes reintentar con el mismo botón.</p>}
              {estado.operacion && <p className="disponibilidad-ayuda" role="status">Guardando disponibilidad...</p>}
            </form>
          ) : (
            <p className="disponibilidad-ayuda" role="status">Selecciona un día para marcarlo o consultar su motivo.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default TecnicoDisponibilidad;
