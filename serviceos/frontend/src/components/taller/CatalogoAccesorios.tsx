import { useId, useState, type FormEvent } from 'react';
import { useCatalogoAccesorios } from './useCatalogoAccesorios';
import '../../styles/tallerCatalogo.css';

export default function CatalogoAccesorios({ bloqueado }: { bloqueado: boolean }) {
  const catalogo = useCatalogoAccesorios();
  const id = useId();
  const [nombre, setNombre] = useState('');
  const [confirmacion, setConfirmacion] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState('');
  const deshabilitado = bloqueado || catalogo.ocupado || catalogo.cargando || Boolean(catalogo.errorCarga);

  async function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (deshabilitado) return;
    if (await catalogo.agregar(nombre)) {
      setNombre('');
      setMensaje('Accesorio frecuente agregado.');
    }
  }

  async function eliminar(accesorioId: number) {
    if (deshabilitado) return;
    if (await catalogo.eliminar(accesorioId)) {
      setConfirmacion(null);
      setMensaje('Opción eliminada del catálogo. El historial se conserva.');
    }
  }

  return (
    <details className="taller-catalogo">
      <summary>Accesorios frecuentes</summary>
      <p className="taller-ayuda">Opciones para recibir equipos. Agregar o borrar aquí no cambia recepciones anteriores.</p>
      {catalogo.cargando ? <p role="status">Cargando accesorios frecuentes...</p>
        : catalogo.errorCarga ? <>
          <p className="taller-error" role="alert">{catalogo.errorCarga}</p>
          <button type="button" disabled={bloqueado} onClick={catalogo.reintentar}>Reintentar</button>
        </> : catalogo.lista.length === 0 ? (
          <p className="taller-ayuda">Todavía no has agregado accesorios frecuentes.</p>
        ) : <ul>
          {catalogo.lista.map((item) => (
            <li key={item.id}>
              <span>{item.nombre}</span>
              {confirmacion === item.id ? <div className="taller-catalogo-confirmacion">
                <span>¿Eliminar esta opción del catálogo? Los accesorios históricos se conservan.</span>
                <button type="button" disabled={deshabilitado} onClick={() => { void eliminar(item.id); }}>
                  Confirmar eliminación
                </button>
                <button type="button" disabled={deshabilitado} onClick={() => setConfirmacion(null)}>Cancelar</button>
              </div> : <button type="button" disabled={deshabilitado}
                aria-label={`Eliminar ${item.nombre} del catálogo`} onClick={() => setConfirmacion(item.id)}>Eliminar</button>}
            </li>
          ))}
        </ul>}
      <form className="taller-formulario" onSubmit={agregar} aria-busy={catalogo.ocupado}>
        <label htmlFor={`${id}-nombre`}>Nuevo accesorio frecuente</label>
        <div className="taller-fila">
          <input id={`${id}-nombre`} value={nombre} disabled={deshabilitado} required
            onChange={(evento) => setNombre(evento.target.value)} />
          <button type="submit" disabled={deshabilitado}>
            {catalogo.ocupado ? 'Guardando...' : 'Agregar accesorio'}
          </button>
        </div>
      </form>
      {catalogo.errorOperacion && <p className="taller-error" role="alert">{catalogo.errorOperacion}</p>}
      {mensaje && <p className="taller-exito" role="status">{mensaje}</p>}
    </details>
  );
}
