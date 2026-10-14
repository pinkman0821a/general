import { useEffect, useState } from 'react';
import { listarFotos, type FotoServicio } from '../../../services/servicioFotosService';
import FotoMiniatura from './FotoMiniatura';
import VisorFoto from './VisorFoto';
import '../../../styles/servicioFotos.css';

export default function FotosServicio({ servicioId }: { servicioId: number }) {
  const [fotos, setFotos] = useState<FotoServicio[] | null>(null);
  const [error, setError] = useState('');
  const [seleccionada, setSeleccionada] = useState<FotoServicio | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controlador = new AbortController();
    listarFotos(servicioId, controlador.signal).then(datos => { if (!controlador.signal.aborted) setFotos(datos); })
      .catch(causa => { if (!controlador.signal.aborted) setError(causa instanceof Error ? causa.message : 'No se pudieron cargar las fotos'); });
    return () => controlador.abort();
  }, [servicioId, revision]);
  return <section className="servicio-fotos" aria-label="Fotos del servicio"><h3>Fotos del servicio</h3>
    {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => { setError(''); setRevision(valor => valor + 1); }}>Reintentar fotos</button></div>
      : fotos === null ? <p role="status">Cargando fotos…</p> : !fotos.length ? <p>Sin fotos del servicio.</p>
        : <div className="fotos-grid">{fotos.map(foto => <FotoMiniatura key={foto.id} servicioId={servicioId} foto={foto} abrir={() => setSeleccionada(foto)} />)}</div>}
    {seleccionada && <VisorFoto key={seleccionada.id} servicioId={servicioId} foto={seleccionada} cerrar={() => setSeleccionada(null)} />}
  </section>;
}
