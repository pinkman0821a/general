import { useState } from 'react';
import type { useFotosEdicion } from './useFotosEdicion';
import type { FotoServicio } from '../../../services/servicioFotosService';
import FotoMiniatura from './FotoMiniatura';
import VisorFoto from './VisorFoto';
import '../../../styles/servicioFotos.css';

export default function EditorFotos({ fotos, servicioId, bloqueado }: { fotos: ReturnType<typeof useFotosEdicion>; servicioId?: number; bloqueado: boolean }) {
  const [seleccionada, setSeleccionada] = useState<FotoServicio | null>(null);
  const cantidad = fotos.datos.existentes.length - fotos.datos.eliminar.length + fotos.datos.nuevas.length;
  return <section className="servicio-fotos servicios-campo-amplio" aria-label="Fotos del servicio">
    <h3>Fotos del servicio</h3><p>Opcional · máximo 5 fotos · 5 MB por foto</p>
    {fotos.cargando ? <p role="status">Cargando fotos existentes…</p> : <>
      <label>Seleccionar fotos<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={bloqueado}
        onChange={evento => { if (!bloqueado) fotos.agregar(Array.from(evento.target.files ?? [])); evento.target.value = ''; }} /></label>
      <p>{cantidad} de 5</p>
      <div className="fotos-grid">{fotos.datos.existentes.map(foto => <div className={`foto-item ${fotos.datos.eliminar.includes(foto.id) ? 'retirada' : ''}`} key={foto.id}>
        <FotoMiniatura servicioId={servicioId!} foto={foto} abrir={() => setSeleccionada(foto)} />
        <button type="button" className="foto-quitar" disabled={bloqueado} aria-label={`${fotos.datos.eliminar.includes(foto.id) ? 'Restaurar' : 'Quitar'} foto ${foto.nombre_original ?? foto.id}`}
          onClick={() => fotos.marcar(foto.id)}>{fotos.datos.eliminar.includes(foto.id) ? '↶' : '×'}</button>
        {fotos.datos.eliminar.includes(foto.id) && <small>Se elimina al guardar</small>}
      </div>)}
        {fotos.datos.nuevas.map(foto => <div className="foto-item" key={foto.id}><img src={foto.url} alt={`Vista previa ${foto.archivo.name}`} />
          <button type="button" className="foto-quitar" disabled={bloqueado} aria-label={`Quitar foto ${foto.archivo.name}`} onClick={() => fotos.quitar(foto.id)}>×</button></div>)}
      </div>
    </>}
    {fotos.error && <div role="alert"><p>{fotos.error}</p>{servicioId && <button type="button" disabled={bloqueado} onClick={fotos.reintentar}>Reintentar fotos existentes</button>}</div>}
    {seleccionada && <VisorFoto key={seleccionada.id} servicioId={servicioId!} foto={seleccionada} cerrar={() => setSeleccionada(null)} />}
  </section>;
}
