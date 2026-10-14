import { Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { descargarComisiones, obtenerPagoTecnicos } from '../../services/comisionesService';
import { mensajeError } from './serviciosAyudas';

export default function ComisionesMes({ mes, coordinador, revision }: { mes: string; coordinador: boolean; revision: number }) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');
  const bloqueo = useRef(false);
  const [resumen, setResumen] = useState<{ mes: string; revision: number; valor?: number; error?: string } | null>(null);
  const [reintento, setReintento] = useState(0);
  useEffect(() => {
    if (!coordinador) return;
    const controlador = new AbortController();
    obtenerPagoTecnicos(mes, controlador.signal)
      .then(valor => { if (!controlador.signal.aborted) setResumen({ mes, revision, valor }); })
      .catch(causa => { if (!controlador.signal.aborted) setResumen({ mes, revision, error: mensajeError(causa) }); });
    return () => controlador.abort();
  }, [coordinador, mes, revision, reintento]);
  async function exportar() {
    if (bloqueo.current) return;
    bloqueo.current = true; setDescargando(true); setError('');
    try { await descargarComisiones(mes); }
    catch (causa) { setError(mensajeError(causa)); }
    finally { bloqueo.current = false; setDescargando(false); }
  }
  const vigente = resumen?.mes === mes && resumen.revision === revision;
  return <section className="comisiones-mes" aria-label="Comisiones del mes">
    {coordinador && <div className="comisiones-resumen">
      <span>Pago técnicos del mes</span>
      <strong>{vigente && resumen.valor !== undefined ? `$ ${new Intl.NumberFormat('es-CO').format(resumen.valor)}` : '—'}</strong>
      <small>Pago generado por todas las operaciones asignadas del mes.</small>
      {vigente && resumen.error && <><p role="alert">{resumen.error}</p>
        <button type="button" onClick={() => setReintento(valor => valor + 1)}>Reintentar resumen</button></>}
    </div>}
    <div><button type="button" disabled={descargando} onClick={() => void exportar()}>
      <Download size={18} />{descargando ? 'Descargando…' : coordinador ? 'Exportar comisiones' : 'Excel de comisiones'}
    </button><p className="servicios-ayuda">Realizados del mes · Sin garantías</p>
    {error && <p role="alert" className="servicios-error">{error}</p>}</div>
  </section>;
}
