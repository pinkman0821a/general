import { useEffect, useRef, useState } from 'react';
import { guardarFotos, listarFotos } from '../../../services/servicioFotosService';
import { mensajeError } from '../serviciosAyudas';
import { crearBorradorFotos } from './borradorFotos';

export function useFotosEdicion(id?: number) {
  const [borrador] = useState(crearBorradorFotos);
  const [datos, setDatos] = useState(borrador.leer);
  const [cargando, setCargando] = useState(id !== undefined);
  const [listaLista, setListaLista] = useState(id === undefined);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const aviso = useRef<string | undefined>(undefined);
  useEffect(() => {
    const controlador = new AbortController();
    if (id !== undefined) listarFotos(id, controlador.signal)
      .then(fotos => { if (!controlador.signal.aborted) { setDatos(borrador.cargar(fotos)); setListaLista(true); } })
      .catch(causa => { if (!controlador.signal.aborted) setError(mensajeError(causa)); })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false); });
    return () => { controlador.abort(); };
  }, [id, revision, borrador]);
  useEffect(() => () => borrador.liberar(), [borrador]);
  function modificar(accion: () => ReturnType<typeof borrador.leer>) {
    setError('');
    try { setDatos(accion()); } catch (causa) { setError(mensajeError(causa)); }
  }
  return { datos, cargando, listaLista, error, aviso, cambios: borrador.cambios,
    agregar: (archivos: File[]) => modificar(() => borrador.agregar(archivos)),
    quitar: (id: string) => modificar(() => borrador.quitar(id)), marcar: (id: number) => modificar(() => borrador.marcar(id)),
    liberar: () => { borrador.liberar(); },
    reintentar: () => { setError(''); setCargando(true); setListaLista(false); setRevision(valor => valor + 1); },
    async guardar(servicioId: number) {
      if (!borrador.cambios()) return;
      const solicitud = borrador.solicitud();
      const resultado = await guardarFotos(servicioId, solicitud.archivos, solicitud.eliminar, solicitud.lote);
      aviso.current = resultado.aviso;
      setDatos(borrador.completado(resultado.fotos));
    },
  };
}
