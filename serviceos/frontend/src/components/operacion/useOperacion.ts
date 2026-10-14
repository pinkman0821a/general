import { useEffect, useState } from 'react';
import { consultarOperacion } from '../../services/agendaService';
import { mensajeError } from '../servicios/serviciosAyudas';

export function useOperacion<T>(ruta: string) {
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState<{ ruta: string; revision: number; datos?: T; error?: string } | null>(null);
  useEffect(() => {
    const controlador = new AbortController();
    consultarOperacion<T>(ruta, controlador.signal)
      .then(datos => { if (!controlador.signal.aborted) setResultado({ ruta, revision, datos }); })
      .catch(causa => { if (!controlador.signal.aborted) setResultado({ ruta, revision, error: mensajeError(causa) }); });
    return () => controlador.abort();
  }, [ruta, revision]);
  const vigente = resultado?.ruta === ruta && resultado.revision === revision;
  return { datos: vigente ? resultado.datos : undefined, error: vigente ? resultado.error : undefined,
    cargando: !vigente, reintentar: () => setRevision(valor => valor + 1) };
}
