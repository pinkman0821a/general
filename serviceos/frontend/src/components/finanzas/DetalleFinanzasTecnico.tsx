import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerDetalleFinanzas, type DetalleFinanzas } from '../../services/finanzasService';
import { mensajeError, mostrarFecha, tiposServicio } from '../servicios/serviciosAyudas';
import EstadoServicio from '../servicios/EstadoServicio';
import { etiquetaMes, formatoCop } from './finanzasAyudas';

export function FichaFinanzasTecnico({ datos }: { datos: DetalleFinanzas }) {
  return <>
    <p>{etiquetaMes(datos.mes)} · {datos.servicios.length} servicios con pago</p>
    {datos.tecnico.activo === 0 && <p className="finanzas-ayuda">Técnico inactivo · Historial conservado</p>}
    {!datos.servicios.length && <p>Sin servicios con pago generado en este mes.</p>}
    <ol className="finanzas-detalle-lista">{datos.servicios.map(servicio => <li key={servicio.id}>
      <div className="finanzas-detalle-cabecera"><time dateTime={servicio.fecha_programada}>{mostrarFecha(servicio.fecha_programada, true)}</time>
        <EstadoServicio estado={servicio.estado} /></div>
      <strong>{servicio.cliente_nombre}</strong><span>{tiposServicio[servicio.tipo]}</span>
      <dl>{servicio.valor_servicio !== null && <div><dt>Valor del servicio</dt><dd>{formatoCop(servicio.valor_servicio)}</dd></div>}
        <div><dt>Pago técnico generado</dt><dd>{formatoCop(servicio.pago_tecnico)}</dd></div></dl>
      <Link to={`/servicios/${servicio.id}`}>Ver servicio</Link>
    </li>)}</ol>
    <div className="finanzas-detalle-total"><span>Total generado</span><strong>{formatoCop(datos.pago_generado)}</strong></div>
  </>;
}

export default function DetalleFinanzasTecnico({ id, nombre, mes, cerrar }: {
  id: number; nombre: string; mes: string; cerrar: () => void;
}) {
  const [datos, setDatos] = useState<DetalleFinanzas | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);
  useEffect(() => {
    const controlador = new AbortController();
    obtenerDetalleFinanzas(id, mes, controlador.signal)
      .then(resultado => { if (!controlador.signal.aborted) setDatos(resultado); })
      .catch(causa => { if (!controlador.signal.aborted) setError(mensajeError(causa)); });
    return () => controlador.abort();
  }, [id, mes, revision]);
  return <aside ref={panel} tabIndex={-1} className="finanzas-detalle" aria-label={`Detalle financiero de ${nombre}`}>
    <div className="finanzas-titulo-detalle"><h2>{nombre}</h2><button type="button" onClick={cerrar}>Cerrar</button></div>
    {error ? <div role="alert"><p>{error}</p><button type="button"
      onClick={() => { setError(''); setRevision(valor => valor + 1); }}>Reintentar detalle</button></div>
      : datos ? <FichaFinanzasTecnico datos={datos} /> : <p role="status">Cargando detalle…</p>}
  </aside>;
}
