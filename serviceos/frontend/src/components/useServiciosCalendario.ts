import { useEffect, useState } from 'react';
import type { Servicio } from '../services/serviciosService';
import { mensajeError } from './servicios/serviciosAyudas';
import { agruparPresenciales, consultarServiciosCalendario } from './serviciosCalendario';

export function useServiciosCalendario(tecnicoId: number, mes: string) {
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState({ clave: '', servicios: [] as Servicio[], error: '' });
  const clave = `${tecnicoId}:${mes}:${revision}`;
  useEffect(() => {
    const controlador = new AbortController();
    consultarServiciosCalendario(tecnicoId, mes, controlador.signal)
      .then((servicios) => {
        if (!controlador.signal.aborted) setResultado({ clave, servicios, error: '' });
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) setResultado({ clave, servicios: [], error: mensajeError(causa) });
      });
    return () => controlador.abort();
  }, [tecnicoId, mes, clave]);

  // La clave oculta inmediatamente el mes anterior, antes incluso de ejecutar el nuevo efecto.
  const vigente = resultado.clave === clave;
  return {
    porDia: agruparPresenciales(vigente ? resultado.servicios : []),
    cargando: !vigente,
    error: vigente ? resultado.error : '',
    reintentar: () => setRevision((valor) => valor + 1),
  };
}
