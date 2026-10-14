import type { Servicio } from '../../services/serviciosService';
import type { Tecnico } from '../../services/tecnicosService';
import { mostrarFecha, tiposServicio } from './serviciosAyudas';
import EstadoServicio from './EstadoServicio';

type Props = { lista: Servicio[]; cargando: boolean; error: string; seleccionado: number | null;
  ocupado: boolean; coordinador: boolean; tecnicos: Tecnico[]; abrir: (id: number) => void; reintentar: () => void };
export default function ListaServicios(props: Props) {
  return <section className="servicios-lista" aria-label="Listado de servicios" aria-busy={props.cargando}>
    {props.error ? <div><p className="servicios-error" role="alert">{props.error}</p>
      <button type="button" disabled={props.ocupado} onClick={props.reintentar}>Reintentar</button></div>
      : props.cargando ? <p role="status">Cargando servicios…</p>
        : !props.lista.length ? <p className="servicios-ayuda">No hay servicios para estos filtros.</p>
          : props.lista.map((servicio) => <button type="button" key={servicio.id}
            className={`servicios-tarjeta ${props.seleccionado === servicio.id ? 'seleccionada' : ''}`}
            aria-pressed={props.seleccionado === servicio.id} disabled={props.ocupado} onClick={() => props.abrir(servicio.id)}>
            <time dateTime={servicio.fecha_programada}>{mostrarFecha(servicio.fecha_programada, true)}</time>
            <div><strong>{servicio.cliente_nombre}</strong><span>{tiposServicio[servicio.tipo]}</span>
              <span className="servicios-maquina">{servicio.maquina}</span>
              {props.coordinador && <span>{props.tecnicos.find((item) => item.id === servicio.tecnico_id)?.nombre ?? `Técnico #${servicio.tecnico_id}`}</span>}
            </div>
            <EstadoServicio estado={servicio.estado} />
          </button>)}
  </section>;
}
