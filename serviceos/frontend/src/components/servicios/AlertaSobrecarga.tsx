import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { AdvertenciaAgenda } from './operacionServicio';
import { mostrarFecha } from './serviciosAyudas';

type Props = { advertencia: AdvertenciaAgenda; guardando: boolean; confirmar: () => void; cancelar: () => void };
export default function AlertaSobrecarga({ advertencia, guardando, confirmar, cancelar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const elemento = dialogo.current;
    const anterior = document.activeElement;
    elemento?.showModal();
    return () => {
      elemento?.close();
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus();
    };
  }, []);
  return <dialog ref={dialogo} className="servicios-alerta agenda-sobrecarga" aria-labelledby="titulo-sobrecarga"
    onCancel={(evento) => { evento.preventDefault(); if (!guardando) cancelar(); }}>
    <AlertTriangle size={28} aria-hidden="true" />
    <h2 id="titulo-sobrecarga">Advertencia de agenda</h2>
    <p>{advertencia.tecnico} ya tiene <strong>{advertencia.existentes}</strong> {advertencia.existentes === 1
      ? 'servicio presencial programado' : 'servicios presenciales programados'} para el {mostrarFecha(advertencia.fecha)}.</p>
    <p>Si continúas tendrá <strong>{advertencia.resultantes}</strong> servicios presenciales ese día.</p>
    <div className="servicios-acciones">
      <button type="button" autoFocus disabled={guardando} onClick={cancelar}>Cancelar</button>
      <button type="button" className="servicios-peligro" disabled={guardando} onClick={confirmar}>
        {guardando ? 'Asignando…' : 'Asignar de todas formas'}
      </button>
    </div>
  </dialog>;
}
