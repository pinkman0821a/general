import { useId, useState, type FormEvent } from 'react';
import { guardarEntrega, type DetalleRecepcion } from '../../services/tallerService';
import { fechaHoy, mostrarFecha } from './tallerAyudas';
import { useOperacionTaller } from './useOperacionTaller';

type Props = {
  recepcion: DetalleRecepcion;
  alGuardar: (recepcion: DetalleRecepcion) => void;
  onOcupado: (ocupado: boolean) => void;
};

export default function EntregaTaller({ recepcion, alGuardar, onOcupado }: Props) {
  const id = useId();
  const entregada = recepcion.estado === 'entregada';
  const [fecha, setFecha] = useState(recepcion.fecha_entrega ?? fechaHoy());
  const [devueltos, setDevueltos] = useState<number[]>(() => entregada
    ? recepcion.accesorios.filter((item) => item.devuelto === 1).map((item) => item.id) : []);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const operacion = useOperacionTaller(onOcupado);

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void operacion.ejecutar(() => guardarEntrega(recepcion.id, {
      fecha_entrega: fecha, accesorios_devueltos: devueltos,
    }), (actualizada) => {
      setCorrigiendo(false);
      alGuardar(actualizada);
    }, 'Entrega guardada correctamente.');
  }

  return (
    <section className="taller-seccion taller-entrega" aria-labelledby={`${id}-titulo`}>
      <h3 id={`${id}-titulo`}>{entregada ? 'Entregada' : 'Entrega del equipo'}</h3>
      {entregada && <>
        <p>Fecha: {mostrarFecha(recepcion.fecha_entrega!)}</p>
        <h4>Accesorios devueltos</h4>
        <ul className="taller-accesorios-estado">
          {recepcion.accesorios.map((accesorio) => (
            <li key={accesorio.id} className={accesorio.devuelto === 1 ? 'devuelto' : 'no-devuelto'}>
              <span aria-hidden="true">{accesorio.devuelto === 1 ? '✓' : '✕'}</span>
              <span>{accesorio.nombre} — {accesorio.devuelto === 1 ? 'Devuelto' : 'No marcado como devuelto'}</span>
            </li>
          ))}
        </ul>
        {recepcion.accesorios.length === 0 && <p className="taller-ayuda">No ingresaron accesorios.</p>}
        {!corrigiendo && <button type="button" onClick={() => setCorrigiendo(true)}>Corregir entrega</button>}
      </>}
      {(!entregada || corrigiendo) && (
        <form className="taller-formulario" onSubmit={guardar} aria-busy={operacion.guardando}>
          <fieldset disabled={operacion.guardando} className="taller-form-contenido">
            <label htmlFor={`${id}-fecha`}>Fecha de entrega *</label>
            <input id={`${id}-fecha`} type="date" required value={fecha}
              min={recepcion.fecha_ingreso} max="9999-12-31"
              onChange={(evento) => setFecha(evento.target.value)} />
            <h4>Accesorios que ingresaron</h4>
            <p className="taller-ayuda" id={`${id}-ayuda`}>
              Confirma los accesorios que se están devolviendo al cliente.
              Marca únicamente los que estás devolviendo; lo recibido permanece registrado arriba.
            </p>
            <h4>Accesorios devueltos · Confirma cuáles estás devolviendo</h4>
            <div className="taller-checklist" aria-describedby={`${id}-ayuda`}>
              {recepcion.accesorios.map((accesorio) => (
                <label key={accesorio.id}>
                  <input type="checkbox" checked={devueltos.includes(accesorio.id)}
                    onChange={(evento) => setDevueltos((actual) => evento.target.checked
                      ? [...actual, accesorio.id] : actual.filter((valor) => valor !== accesorio.id))} />
                  <span>{accesorio.nombre}<small>Estoy devolviendo este accesorio</small></span>
                </label>
              ))}
            </div>
            {recepcion.accesorios.length === 0 && (
              <p className="taller-ayuda">Este equipo ingresó sin accesorios. Puedes confirmar su entrega.</p>
            )}
            <div className="taller-acciones">
              {corrigiendo && <button type="button" onClick={() => {
                setCorrigiendo(false);
                setFecha(recepcion.fecha_entrega!);
                setDevueltos(recepcion.accesorios.filter((item) => item.devuelto === 1).map((item) => item.id));
              }}>Cancelar corrección</button>}
              <button type="submit" className="taller-primario">
                {operacion.guardando ? 'Guardando entrega...' : entregada ? 'Guardar corrección' : 'Confirmar entrega'}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {operacion.error && <p className="taller-error" role="alert">{operacion.error}</p>}
      {operacion.mensaje && <p className="taller-exito" role="status">{operacion.mensaje}</p>}
    </section>
  );
}
