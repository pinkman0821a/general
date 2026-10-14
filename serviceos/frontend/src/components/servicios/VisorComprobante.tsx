import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function VisorComprobante({ url, cerrar }: { url: string; cerrar: () => void }) {
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
  return <dialog ref={dialogo} className="comprobante-visor" aria-label="Comprobante de pago"
    onCancel={(evento) => { evento.preventDefault(); cerrar(); }}>
    <button type="button" autoFocus aria-label="Cerrar comprobante" onClick={cerrar}><X size={20} /></button>
    <img src={url} alt="Comprobante de pago del cliente" />
  </dialog>;
}
