import { useEffect, useRef, useState } from 'react';
import { eliminarServicio } from '../../services/serviciosService';
import { mensajeError } from './serviciosAyudas';

type Props = { id: number; coordinador: boolean; ocupado: boolean;
  onOcupado: (valor: boolean) => void; alEliminar: (id: number) => void };

export function ConfirmarEliminacion({ eliminando, cancelar, confirmar }: {
  eliminando: boolean; cancelar: () => void; confirmar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const elemento = dialogo.current, anterior = document.activeElement;
    elemento?.showModal();
    return () => { elemento?.close(); if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus(); };
  }, []);
  return <dialog ref={dialogo} className="servicios-alerta" aria-labelledby="titulo-eliminar-servicio"
    aria-describedby="aviso-eliminar-servicio" aria-busy={eliminando}
    onCancel={evento => { evento.preventDefault(); if (!eliminando) cancelar(); }}>
    <h2 id="titulo-eliminar-servicio">¿Eliminar este servicio?</h2>
    <p id="aviso-eliminar-servicio">Esta acción eliminará permanentemente el servicio y sus archivos asociados. No se puede deshacer.</p>
    <div className="servicios-acciones">
      <button type="button" autoFocus disabled={eliminando} onClick={cancelar}>Cancelar</button>
      <button type="button" className="servicios-peligro" disabled={eliminando} onClick={confirmar}>
        {eliminando ? 'Eliminando…' : 'Eliminar servicio'}</button>
    </div>
  </dialog>;
}

export default function EliminarServicio(props: Props) {
  const [confirmacion, setConfirmacion] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState('');
  const bloqueo = useRef(false);
  const activo = useRef(true);
  useEffect(() => { activo.current = true; return () => { activo.current = false; }; }, []);
  function cancelar() {
    if (bloqueo.current) return;
    setConfirmacion(false); props.onOcupado(false);
  }
  async function confirmar() {
    if (bloqueo.current || !confirmacion || !props.coordinador) return;
    bloqueo.current = true; setEliminando(true); setError('');
    try {
      await eliminarServicio(props.id);
      if (activo.current) { props.onOcupado(false); props.alEliminar(props.id); setConfirmacion(false); }
    } catch (causa) {
      if (activo.current) { setError(mensajeError(causa)); setConfirmacion(false); props.onOcupado(false); }
    } finally {
      bloqueo.current = false;
      if (activo.current) setEliminando(false);
    }
  }
  if (!props.coordinador) return null;
  return <div className="servicios-eliminar">
    <button type="button" className="servicios-peligro" disabled={props.ocupado || confirmacion || eliminando}
      onClick={() => { if (props.ocupado || bloqueo.current) return;
        setError(''); setConfirmacion(true); props.onOcupado(true); }}>Eliminar servicio</button>
    {confirmacion && <ConfirmarEliminacion eliminando={eliminando} cancelar={cancelar} confirmar={() => void confirmar()} />}
    {error && <p role="alert" className="servicios-error">{error}</p>}
  </div>;
}
