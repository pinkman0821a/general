import { useEffect, useState, type ReactNode } from 'react';
import { cambiarEstadoServicio, obtenerServicio, type EstadoServicio as Estado, type Servicio } from '../../services/serviciosService';
import type { Tecnico } from '../../services/tecnicosService';
import { estadosServicio, mensajeError, mostrarFecha, tiposServicio } from './serviciosAyudas';
import EstadoServicio from './EstadoServicio';
import { useOperacionServicio } from './useOperacionServicio';
import ComprobantePago from './ComprobantePago';
import FotosServicio from './fotos/FotosServicio';
import EliminarServicio from './EliminarServicio';
import '../../styles/servicioDetalle.css';

type Props = {
  id: number; coordinador: boolean; tecnicos: Tecnico[];
  cerrar: () => void; editar: (servicio: Servicio) => void;
  alGuardar: (servicio: Servicio) => void; onOcupado: (ocupado: boolean) => void;
  alEliminar?: (id: number) => void;
};
function DatosDetalle({ campos, principal = false }: { campos: [string, string | null | undefined][]; principal?: boolean }) {
  return <dl className={`servicio-detalle-datos ${principal ? 'servicio-detalle-principal' : ''}`}>
    {campos.filter(([, valor]) => !!valor).map(([etiqueta, valor]) => <div key={etiqueta}
      className={principal && ['Máquina', 'Dirección'].includes(etiqueta) ? 'servicio-detalle-destacado' : undefined}>
      <dt>{etiqueta}</dt><dd>{valor}</dd>
    </div>)}
  </dl>;
}

export function FichaServicio({ servicio, coordinador, tecnico, ocupado, cerrar, editar, cambiarEstado, children }: {
  servicio: Servicio; coordinador: boolean; tecnico: string; ocupado: boolean;
  cerrar: () => void; editar: () => void; cambiarEstado: (estado: Estado) => void;
  children?: ReactNode;
}) {
  const principales: [string, string | null | undefined][] = [
    ['Máquina', servicio.maquina], ['Teléfono', servicio.cliente_telefono],
    ['Dirección', servicio.direccion], ['Ciudad', servicio.ciudad],
    ['Fecha programada', mostrarFecha(servicio.fecha_programada)],
  ];
  const tecnicos: [string, string | null | undefined][] = [
    ['Tipo de servicio', tiposServicio[servicio.tipo]], ['Tipo de falla', servicio.tipo_falla],
  ];
  if (coordinador) tecnicos.push(['Técnico asignado', tecnico]);
  return <>
    <div className="servicios-cabecera-panel servicio-detalle-cabecera"><h2>{servicio.cliente_nombre}</h2>
      <button type="button" disabled={ocupado} onClick={cerrar}>{coordinador ? 'Cerrar' : 'Volver al listado'}</button></div>
    <div className="servicio-detalle-resumen"><span>{tiposServicio[servicio.tipo]}</span><EstadoServicio estado={servicio.estado} /></div>
    <section className="servicio-detalle-zona" aria-label="Información principal">
      <h3>Información principal</h3><DatosDetalle campos={principales} principal />
    </section>
    <section className="servicio-detalle-zona" aria-label="Información técnica">
      <h3>Información técnica</h3><DatosDetalle campos={tecnicos} />
    </section>
    <section className="servicio-detalle-zona servicio-detalle-ejecucion" aria-label="Ejecución del servicio">
      <h3>Ejecución del servicio</h3>
      <label className="servicios-control-estado">Estado
        <select aria-label="Cambiar estado" value={servicio.estado} disabled={ocupado}
          onChange={(evento) => cambiarEstado(evento.target.value as Estado)}>
          {Object.entries(estadosServicio).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
        </select>
      </label>
      {servicio.observaciones && <DatosDetalle campos={[[ 'Observaciones', servicio.observaciones ]]} />}
      {children}
    </section>
    {coordinador && <div className="servicio-detalle-editar"><button type="button" disabled={ocupado} onClick={editar}>Editar</button></div>}
  </>;
}

export default function DetalleServicio(props: Props) {
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [ocupadoComprobante, setOcupadoComprobante] = useState(false);
  const [ocupadoEliminacion, setOcupadoEliminacion] = useState(false);
  const textoCerrar = props.coordinador ? 'Cerrar' : 'Volver al listado';
  const operacion = useOperacionServicio((guardado) => {
    setServicio(guardado);
    props.alGuardar(guardado);
  }, props.onOcupado);
  useEffect(() => {
    const controlador = new AbortController();
    obtenerServicio(props.id, controlador.signal)
      .then((datos) => { if (!controlador.signal.aborted) { setServicio(datos); } })
      .catch((causa: unknown) => { if (!controlador.signal.aborted) setError(mensajeError(causa)); });
    return () => controlador.abort();
  }, [props.id, revision]);
  return <section className="servicios-panel servicio-detalle" aria-label="Detalle del servicio" aria-busy={operacion.guardando}>
    {error ? <><p role="alert" className="servicios-error">{error}</p>
      <button type="button" onClick={() => { setError(''); setRevision((valor) => valor + 1); }}>Reintentar</button>
      <button type="button" onClick={props.cerrar}>{textoCerrar}</button></>
      : servicio ? <FichaServicio servicio={servicio} coordinador={props.coordinador}
        tecnico={props.tecnicos.find((item) => item.id === servicio.tecnico_id)?.nombre ?? `Técnico #${servicio.tecnico_id}`}
        ocupado={operacion.guardando || ocupadoComprobante || ocupadoEliminacion} cerrar={props.cerrar} editar={() => props.editar(servicio)}
        cambiarEstado={(estado) => { if (estado !== servicio.estado) void operacion.ejecutar(() => cambiarEstadoServicio(servicio.id, estado)); }}>
        <FotosServicio servicioId={servicio.id} />
      </FichaServicio>
        : <><p role="status">Cargando detalle…</p><button type="button" onClick={props.cerrar}>{textoCerrar}</button></>}
    {servicio && !error && <ComprobantePago servicio={servicio} coordinador={props.coordinador}
      ocupado={operacion.guardando || ocupadoEliminacion} onOcupado={(valor) => { setOcupadoComprobante(valor); props.onOcupado(valor); }}
      alGuardar={(guardado) => { setServicio(guardado); props.alGuardar(guardado); }} />}
    {servicio && !error && props.coordinador && props.alEliminar && <EliminarServicio id={servicio.id} coordinador
      ocupado={operacion.guardando || ocupadoComprobante} alEliminar={props.alEliminar}
      onOcupado={valor => { setOcupadoEliminacion(valor); props.onOcupado(valor); }} />}
    {operacion.guardando && <p role="status">Actualizando estado…</p>}
    {operacion.error && <p role="alert" className="servicios-error">{operacion.error}</p>}
  </section>;
}
