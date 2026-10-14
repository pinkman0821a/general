import { useEffect, useState } from 'react';
import { obtenerFinanzas, type ResumenFinanzas } from '../../services/finanzasService';
import { mensajeError } from '../servicios/serviciosAyudas';

export function useFinanzas(mes: string) {
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState<{ mes: string; revision: number; datos?: ResumenFinanzas; error?: string } | null>(null);
  useEffect(() => {
    const controlador = new AbortController();
    obtenerFinanzas(mes, controlador.signal)
      .then(datos => { if (!controlador.signal.aborted) setResultado({ mes, revision, datos }); })
      .catch(causa => { if (!controlador.signal.aborted) setResultado({ mes, revision, error: mensajeError(causa) }); });
    return () => controlador.abort();
  }, [mes, revision]);
  const vigente = resultado?.mes === mes && resultado.revision === revision;
  return { datos: vigente ? resultado.datos : undefined, error: vigente ? resultado.error : undefined,
    cargando: !vigente, reintentar: () => setRevision(valor => valor + 1) };
}
