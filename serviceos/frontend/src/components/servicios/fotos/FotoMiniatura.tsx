import { useEffect, useState } from 'react';
import { obtenerFoto, type FotoServicio } from '../../../services/servicioFotosService';

export default function FotoMiniatura({ servicioId, foto, abrir }: { servicioId: number; foto: FotoServicio; abrir: () => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controlador = new AbortController();
    let temporal = '';
    obtenerFoto(servicioId, foto.id, controlador.signal).then(blob => {
      if (!controlador.signal.aborted) { temporal = URL.createObjectURL(blob); setUrl(temporal); }
    }).catch(causa => { if (!controlador.signal.aborted) setError(causa instanceof Error ? causa.message : 'No se pudo cargar la foto'); });
    return () => { controlador.abort(); if (temporal) URL.revokeObjectURL(temporal); };
  }, [servicioId, foto.id, revision]);
  return error ? <button type="button" className="foto-miniatura" title={error} onClick={() => { setError(''); setRevision(valor => valor + 1); }}>Reintentar foto</button>
    : <button type="button" className="foto-miniatura" onClick={abrir} disabled={!url} aria-label={`Ver foto ${foto.nombre_original ?? foto.id}`}>
      {url ? <img src={url} alt={foto.nombre_original ?? 'Foto del servicio'} /> : <span>Cargando foto…</span>}
    </button>;
}
