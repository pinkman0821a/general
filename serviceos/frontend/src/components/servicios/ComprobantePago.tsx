import { useEffect, useRef, useState } from 'react';
import type { Servicio } from '../../services/serviciosService';
import { crearVisorComprobante, eliminarComprobante, obtenerComprobante, subirComprobante, validarArchivoComprobante } from '../../services/comprobanteService';
import { admiteValor, mensajeError } from './serviciosAyudas';
import VisorComprobante from './VisorComprobante';
import '../../styles/comprobantePago.css';

type Props = { servicio: Servicio; coordinador: boolean; ocupado: boolean;
  alGuardar: (servicio: Servicio) => void; onOcupado: (ocupado: boolean) => void };

export default function ComprobantePago(props: Props) {
  // Nunca montar el bloque administrativo para técnicos ni tipos que no lo admiten.
  if (!props.coordinador || !admiteValor(props.servicio.tipo)) return null;
  return <GestionComprobante {...props} />;
}

function GestionComprobante({ servicio, ocupado, alGuardar, onOcupado }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [visor] = useState(() => crearVisorComprobante(setUrl));
  const bloqueado = useRef(false);
  const activo = useRef(false);
  const entrada = useRef<HTMLInputElement>(null);
  const descarga = useRef<AbortController | null>(null);
  useEffect(() => {
    activo.current = true;
    return () => { activo.current = false; descarga.current?.abort(); visor.destruir(); };
  }, [visor]);

  async function ejecutar(accion: () => Promise<void>) {
    if (bloqueado.current || ocupado || !activo.current) return;
    bloqueado.current = true;
    setGuardando(true); setError(''); setMensaje(''); onOcupado(true);
    try { await accion(); }
    catch (causa) { if (activo.current) setError(mensajeError(causa)); }
    finally {
      bloqueado.current = false;
      if (activo.current) { setGuardando(false); onOcupado(false); }
    }
  }
  function actualizar(resultado: { servicio: Servicio; aviso?: string }, texto: string) {
    if (!activo.current) return;
    setArchivo(null); setEliminando(false);
    setMensaje(resultado.aviso ?? texto);
    alGuardar(resultado.servicio);
  }
  function seleccionar(nuevo: File | undefined) {
    setError(''); setMensaje(''); setEliminando(false); setArchivo(null);
    if (!nuevo) return;
    try { validarArchivoComprobante(nuevo); setArchivo(nuevo); }
    catch (causa) { setError(mensajeError(causa)); }
  }
  const deshabilitado = ocupado || guardando;
  return <section className="comprobante-pago" aria-label="Comprobante de pago" aria-busy={guardando}>
    <h3>Comprobante de pago</h3>
    <p className="servicios-ayuda">{servicio.tiene_comprobante ? 'Comprobante cargado' : 'Sin comprobante'}</p>
    {servicio.tiene_comprobante && <p className="comprobante-metadatos">
      {servicio.comprobante_nombre}{servicio.comprobante_size ? ` · ${Math.ceil(servicio.comprobante_size / 1024)} KB` : ''}
    </p>}
    <input ref={entrada} className="servicios-sr" type="file" tabIndex={-1} aria-label="Archivo de comprobante"
      accept="image/jpeg,image/png,image/webp" disabled={deshabilitado}
      onChange={(evento) => { seleccionar(evento.target.files?.[0]); evento.target.value = ''; }} />
    <div className="servicios-acciones">
      {servicio.tiene_comprobante && <button type="button" disabled={deshabilitado} onClick={() => { void ejecutar(async () => {
        descarga.current = new AbortController();
        const blob = await obtenerComprobante(servicio.id, descarga.current.signal);
        if (activo.current) visor.abrir(blob);
      }); }}>Ver comprobante</button>}
      <button type="button" disabled={deshabilitado} onClick={() => entrada.current?.click()}>
        {servicio.tiene_comprobante ? 'Reemplazar' : 'Subir comprobante'}</button>
      {servicio.tiene_comprobante && <button type="button" disabled={deshabilitado}
        onClick={() => { setArchivo(null); setEliminando(true); setError(''); }}>Eliminar</button>}
    </div>
    {archivo && <div className="comprobante-confirmacion">
      <p>{archivo.name} · {Math.ceil(archivo.size / 1024)} KB</p>
      {servicio.tiene_comprobante && <p>El comprobante actual será reemplazado.</p>}
      <div className="servicios-acciones">
        <button type="button" disabled={deshabilitado} onClick={() => setArchivo(null)}>Cancelar</button>
        <button type="button" disabled={deshabilitado} onClick={() => { void ejecutar(async () =>
          actualizar(await subirComprobante(servicio.id, archivo), 'Comprobante guardado correctamente.')); }}>Confirmar subida</button>
      </div>
    </div>}
    {eliminando && <div className="comprobante-confirmacion">
      <p>¿Eliminar el comprobante de pago?</p>
      <div className="servicios-acciones">
        <button type="button" disabled={deshabilitado} onClick={() => setEliminando(false)}>Cancelar</button>
        <button type="button" className="servicios-peligro" disabled={deshabilitado} onClick={() => { void ejecutar(async () =>
          actualizar(await eliminarComprobante(servicio.id), 'Comprobante eliminado.')); }}>Confirmar eliminación</button>
      </div>
    </div>}
    {guardando && <p role="status">Procesando comprobante…</p>}
    {error && <p className="servicios-error" role="alert">{error}</p>}
    {mensaje && <p className="servicios-ayuda" role="status">{mensaje}</p>}
    {url && <VisorComprobante url={url} cerrar={visor.cerrar} />}
  </section>;
}
