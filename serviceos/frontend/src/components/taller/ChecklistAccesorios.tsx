import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { normalizarAccesorio } from './tallerAyudas';
import { useCatalogoAccesorios } from './useCatalogoAccesorios';

type Props = { nombres: string[]; registrados?: string[]; cambiar: (nombres: string[]) => void };

export default function ChecklistAccesorios({ nombres, registrados = [], cambiar }: Props) {
  const catalogo = useCatalogoAccesorios();
  const id = useId();
  const [otro, setOtro] = useState('');
  const [error, setError] = useState('');
  const [agregando, setAgregando] = useState(false);
  const opciones = [...new Map([...registrados, ...nombres, ...catalogo.lista.map((item) => item.nombre)]
    .map((nombre) => [normalizarAccesorio(nombre), nombre])).values()];

  function alternar(nombre: string) {
    const existente = nombres.find((item) => normalizarAccesorio(item) === normalizarAccesorio(nombre));
    cambiar(existente ? nombres.filter((item) => item !== existente) : [...nombres, nombre]);
    setError('');
  }

  function agregar() {
    const nombre = otro.trim();
    if (!nombre) { setError('Escribe el nombre del accesorio.'); return; }
    if (nombres.some((item) => normalizarAccesorio(item) === normalizarAccesorio(nombre))) {
      setError('Este accesorio ya está marcado como recibido.');
      return;
    }
    const frecuente = catalogo.lista.find((item) => normalizarAccesorio(item.nombre) === normalizarAccesorio(nombre));
    cambiar([...nombres, frecuente?.nombre ?? nombre]);
    setOtro('');
    setError('');
  }

  return (
    <div className="taller-accesorios-ingreso">
      <p className="taller-ayuda">Marca únicamente lo que llegó con el equipo. Puede ingresar sin accesorios.</p>
      {catalogo.cargando && <p className="taller-ayuda" role="status">Cargando accesorios frecuentes...</p>}
      {catalogo.errorCarga && <>
        <p className="taller-error" role="alert">{catalogo.errorCarga}</p>
        <button type="button" onClick={catalogo.reintentar}>Reintentar catálogo</button>
      </>}
      {!catalogo.cargando && !catalogo.errorCarga && catalogo.lista.length === 0 && (
        <p className="taller-ayuda">No hay accesorios frecuentes. Puedes agregar uno solo para esta recepción.</p>
      )}
      <div className="taller-checklist">
        {opciones.map((nombre) => (
          <label key={normalizarAccesorio(nombre)}>
            <input type="checkbox" checked={nombres.some((item) =>
              normalizarAccesorio(item) === normalizarAccesorio(nombre))}
              onChange={() => alternar(nombre)} />
            <span>{nombres.find((item) => normalizarAccesorio(item) === normalizarAccesorio(nombre)) ?? nombre}</span>
          </label>
        ))}
      </div>
      <button type="button" aria-expanded={agregando} aria-controls={`${id}-otro`}
        onClick={() => setAgregando(!agregando)}><Plus size={16} />Agregar otro accesorio</button>
      {agregando && <div id={`${id}-otro`} className="taller-otro-accesorio">
        <p className="taller-ayuda">Este accesorio se guarda solo en esta recepción, sin añadirlo al catálogo.</p>
        <label htmlFor={`${id}-nombre`}>Nombre del accesorio</label>
        <div className="taller-fila">
          <input id={`${id}-nombre`} value={otro} placeholder="Ej. Control remoto"
            onChange={(evento) => { setOtro(evento.target.value); setError(''); }}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') { evento.preventDefault(); agregar(); }
            }} />
          <button type="button" onClick={agregar}>Agregar</button>
        </div>
      </div>}
      {error && <p className="taller-error" role="alert">{error}</p>}
    </div>
  );
}
