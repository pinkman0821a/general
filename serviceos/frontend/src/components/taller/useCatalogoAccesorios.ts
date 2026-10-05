import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  crearAccesorioFrecuente, eliminarAccesorioFrecuente, listarAccesoriosFrecuentes,
  type AccesorioFrecuente,
} from '../../services/tallerCatalogoService';
import { mensajeError, normalizarAccesorio } from './tallerAyudas';

export function useCatalogo() {
  const [lista, setLista] = useState<AccesorioFrecuente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorOperacion, setErrorOperacion] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [revision, setRevision] = useState(0);
  const bloqueo = useRef(false);
  const activo = useRef(false);

  useEffect(() => {
    activo.current = true;
    return () => { activo.current = false; };
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    listarAccesoriosFrecuentes(controlador.signal)
      .then((datos) => { if (!controlador.signal.aborted) setLista(datos); })
      .catch((causa: unknown) => { if (!controlador.signal.aborted) setErrorCarga(mensajeError(causa)); })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false); });
    return () => { controlador.abort(); };
  }, [revision]);

  function reintentar() {
    if (bloqueo.current || cargando) return;
    setCargando(true);
    setErrorCarga('');
    setRevision((valor) => valor + 1);
  }

  async function ejecutar(accion: () => Promise<void>) {
    if (bloqueo.current || cargando || errorCarga || !activo.current) return false;
    bloqueo.current = true;
    setOcupado(true);
    setErrorOperacion('');
    try {
      await accion();
      return activo.current;
    } catch (causa) {
      if (activo.current) setErrorOperacion(mensajeError(causa));
      return false;
    } finally {
      bloqueo.current = false;
      if (activo.current) setOcupado(false);
    }
  }

  function agregar(nombre: string) {
    const limpio = nombre.trim();
    if (!limpio) {
      setErrorOperacion('Escribe el nombre del accesorio.');
      return Promise.resolve(false);
    }
    if (lista.some((item) => normalizarAccesorio(item.nombre) === normalizarAccesorio(limpio))) {
      setErrorOperacion('Ese accesorio frecuente ya existe.');
      return Promise.resolve(false);
    }
    return ejecutar(async () => {
      const nuevo = await crearAccesorioFrecuente(limpio);
      if (activo.current) setLista((actual) => [...actual, nuevo]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    });
  }

  function eliminar(id: number) {
    return ejecutar(async () => {
      await eliminarAccesorioFrecuente(id);
      if (activo.current) setLista((actual) => actual.filter((item) => item.id !== id));
    });
  }

  return { lista, cargando, errorCarga, errorOperacion, ocupado, reintentar, agregar, eliminar };
}

export const ContextoCatalogoAccesorios = createContext<ReturnType<typeof useCatalogo> | null>(null);

export function useCatalogoAccesorios() {
  const catalogo = useContext(ContextoCatalogoAccesorios);
  if (!catalogo) throw new Error('El catálogo requiere el acceso de coordinador');
  return catalogo;
}
