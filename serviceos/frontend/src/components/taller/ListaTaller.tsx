import type { Recepcion } from '../../services/tallerService';
import TarjetaTaller from './TarjetaTaller';

type Props = {
  lista: Recepcion[];
  cargando: boolean;
  error: string;
  seleccionado: number | null;
  ocupado: boolean;
  abrir: (id: number) => void;
  reintentar: () => void;
};

export default function ListaTaller(props: Props) {
  return (
    <section className="taller-lista" aria-label="Recepciones de Taller" aria-busy={props.cargando}>
      {props.cargando ? <p className="taller-ayuda" role="status">Cargando recepciones...</p>
        : props.error ? <div>
          <p className="taller-error" role="alert">{props.error}</p>
          <button type="button" disabled={props.ocupado} onClick={props.reintentar}>Reintentar</button>
        </div> : props.lista.length === 0 ? (
          <p className="taller-ayuda">No hay recepciones para estos filtros.</p>
        ) : props.lista.map((recepcion) => (
          <TarjetaTaller key={recepcion.id} recepcion={recepcion}
            seleccionada={props.seleccionado === recepcion.id} ocupado={props.ocupado}
            abrir={() => props.abrir(recepcion.id)} />
        ))}
    </section>
  );
}
