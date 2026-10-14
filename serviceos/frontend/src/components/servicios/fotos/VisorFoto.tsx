import { useEffect, useRef, useState } from 'react';
import { obtenerFoto, type FotoServicio } from '../../../services/servicioFotosService';

export default function VisorFoto({ servicioId, foto, cerrar }: { servicioId: number; foto: FotoServicio; cerrar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controlador = new AbortController(); let temporal = '';
    const anterior = document.activeElement;
    dialogo.current?.showModal();
    obtenerFoto(servicioId, foto.id, controlador.signal).then(blob => {
      if (!controlador.signal.aborted) { temporal = URL.createObjectURL(blob); setUrl(temporal); }
    }).catch(causa => { if (!controlador.signal.aborted) setError(causa instanceof Error ? causa.message : 'No se pudo abrir la foto'); });
    const elemento = dialogo.current;
    return () => {
      controlador.abort(); if (temporal) URL.revokeObjectURL(temporal); elemento?.close();
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus();
    };
  }, [servicioId, foto.id]);
  return <dialog ref={dialogo} className="foto-visor" aria-label="Foto del servicio" onCancel={evento => { evento.preventDefault(); cerrar(); }}>
    <button type="button" autoFocus aria-label="Cerrar foto" onClick={cerrar}>×</button>
    {error ? <p role="alert">{error}</p> : url ? <img src={url} alt={foto.nombre_original ?? 'Foto del servicio'} /> : <p role="status">Cargando foto…</p>}
  </dialog>;
}
