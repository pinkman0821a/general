import { useEffect, useRef, useState } from 'react';
import { obtenerDetalleTaller, type DetalleRecepcion } from '../../services/tallerService';
import EntregaTaller from './EntregaTaller';
import FormularioRecepcion from './FormularioRecepcion';
import { mensajeError, mostrarFecha } from './tallerAyudas';

type Props = {
  id: number;
  coordinador: boolean;
  ocupado: boolean;
  cerrar: () => void;
  alGuardar: (recepcion: DetalleRecepcion) => void;
  onOcupado: (ocupado: boolean) => void;
};

function Datos({ titulo, campos }: { titulo: string; campos: [string, string | null][] }) {
  return (
    <section className="taller-seccion">
      <h3>{titulo}</h3>
      <dl className="taller-datos">
        {campos.map(([etiqueta, valor]) => (
          <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor || 'Sin registrar'}</dd></div>
        ))}
      </dl>
    </section>
  );
}

// La página monta una ficha distinta por ID: no conserva datos de otro equipo.
export default function DetalleTaller(props: Props) {
  const [recepcion, setRecepcion] = useState<DetalleRecepcion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(false);
  const [intento, setIntento] = useState(0);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 1100px)').matches) {
      panel.current?.scrollIntoView({ block: 'start' });
    }
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    obtenerDetalleTaller(props.id, controlador.signal)
      .then((datos) => { if (!controlador.signal.aborted) setRecepcion(datos); })
      .catch((causa: unknown) => { if (!controlador.signal.aborted) setError(mensajeError(causa)); })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false); });
    return () => { controlador.abort(); };
  }, [props.id, intento]);

  function actualizar(datos: DetalleRecepcion) {
    setRecepcion(datos);
    setEditando(false);
    props.alGuardar(datos);
  }

  return (
    <section className="taller-detalle" tabIndex={-1} ref={panel} aria-label="Detalle de recepción"
      aria-busy={cargando || props.ocupado}>
      <div className="taller-acciones taller-detalle-cabecera">
        <button type="button" disabled={props.ocupado} onClick={props.cerrar}>Volver al listado</button>
        {recepcion && !editando && props.coordinador && (
          <button type="button" disabled={props.ocupado} onClick={() => setEditando(true)}>Editar recepción</button>
        )}
      </div>
      {cargando ? <p className="taller-ayuda" role="status">Cargando detalle...</p>
        : error ? <div>
          <p className="taller-error" role="alert">{error}</p>
          <button type="button" onClick={() => {
            setError('');
            setCargando(true);
            setIntento((valor) => valor + 1);
          }}>Reintentar</button>
        </div> : recepcion && (editando && props.coordinador ? (
          <FormularioRecepcion recepcion={recepcion} alGuardar={actualizar}
            cancelar={() => setEditando(false)} onOcupado={props.onOcupado} />
        ) : (
          <div className="taller-panel">
            <h2>{recepcion.cliente_nombre}</h2>
            <p className="taller-maquina">
              {recepcion.maquina_tipo}{recepcion.maquina_tamano && ` · ${recepcion.maquina_tamano}`}
            </p>
            <p className={`taller-estado ${recepcion.estado}`}>
              {recepcion.estado === 'en_taller' ? 'En taller'
                : `Entregada — ${mostrarFecha(recepcion.fecha_entrega!)}`}
            </p>
            <Datos titulo="Cliente" campos={[
              ['Nombre / empresa', recepcion.cliente_nombre], ['Contacto', recepcion.cliente_contacto],
              ['Teléfono', recepcion.cliente_telefono],
            ]} />
            <Datos titulo="Máquina" campos={[
              ['Tipo', recepcion.maquina_tipo], ['Tamaño', recepcion.maquina_tamano],
              ['Marca', recepcion.maquina_marca], ['Modelo', recepcion.maquina_modelo],
            ]} />
            <Datos titulo="Ingreso" campos={[
              ['Fecha', mostrarFecha(recepcion.fecha_ingreso)], ['Falla reportada', recepcion.falla_reportada],
              ['Observaciones', recepcion.observaciones],
            ]} />
            <section className="taller-seccion taller-accesorios-destacados">
              <h3>Accesorios recibidos</h3>
              <p className="taller-ayuda">Registro de lo que llegó con el equipo.</p>
              {recepcion.accesorios.length === 0 ? <p>Ingresó sin accesorios.</p> : (
                <ul className="taller-accesorios-estado">
                  {recepcion.accesorios.map((accesorio) => (
                    <li key={accesorio.id}><span aria-hidden="true">✓</span><span>{accesorio.nombre}</span></li>
                  ))}
                </ul>
              )}
            </section>
            <EntregaTaller
              key={`${recepcion.fecha_entrega}-${recepcion.accesorios.map((item) => `${item.id}:${item.devuelto}`).join(',')}`}
              recepcion={recepcion} alGuardar={actualizar} onOcupado={props.onOcupado} />
          </div>
        ))}
    </section>
  );
}
