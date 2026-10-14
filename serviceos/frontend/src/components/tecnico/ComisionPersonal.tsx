import { useEffect, useState } from 'react';
import { etiquetaMes, formatoCop } from '../finanzas/finanzasAyudas';
import { obtenerComisionPersonal, type ResumenPersonal } from '../../services/tecnicoFinanzasService';

export default function ComisionPersonal({ habilitado }: { habilitado: boolean }) {
  const [datos, setDatos] = useState<ResumenPersonal | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!habilitado) return;
    const controlador = new AbortController();
    async function cargar() {
      try {
        const cuerpo = await obtenerComisionPersonal(controlador.signal);
        if (!controlador.signal.aborted) setDatos(cuerpo);
      } catch (causa) {
        if (!controlador.signal.aborted) setError(causa instanceof Error ? causa.message : 'No se pudo consultar tu comisión.');
      }
    }
    void cargar();
    return () => controlador.abort();
  }, [habilitado, revision]);
  return <section className="tecnico-comision" aria-label="Mi comisión generada del mes">
    <span>Comisiones del mes</span>
    {error ? <div role="alert"><p>{error}</p><button onClick={() => { setError(''); setRevision(valor => valor + 1); }}>Reintentar comisión</button></div>
      : datos ? <><strong>{formatoCop(datos.pago_generado)}</strong><p>{etiquetaMes(datos.mes)}</p>
        <small>{datos.servicios_con_pago} servicios con pago</small></>
        : <p role="status">Cargando tu comisión…</p>}
  </section>;
}
