import { useEffect, useRef, useState } from 'react';
import {
  listarTaller, type DetalleRecepcion, type FiltroTaller, type Recepcion,
} from '../../services/tallerService';
import { mensajeError } from './tallerAyudas';

export function useTaller() {
  const [lista, setLista] = useState<Recepcion[]>([]);
  const [resumen, setResumen] = useState<Recepcion[]>([]);
  const [filtro, setFiltro] = useState<FiltroTaller>('en_taller');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [error, setError] = useState('');
  const [errorResumen, setErrorResumen] = useState('');
  const [revision, setRevision] = useState(0);
  const consulta = useRef(0);

  useEffect(() => {
    const controlador = new AbortController();
    const numero = ++consulta.current;
    const vigente = () => !controlador.signal.aborted && consulta.current === numero;
    const temporizador = window.setTimeout(() => {
      listarTaller(filtro, busqueda, controlador.signal)
        .then((datos) => { if (vigente()) setLista(datos); })
        .catch((causa: unknown) => { if (vigente()) setError(mensajeError(causa)); })
        .finally(() => { if (vigente()) setCargando(false); });
    }, 250);
    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [filtro, busqueda, revision]);

  useEffect(() => {
    const controlador = new AbortController();
    listarTaller('todas', '', controlador.signal)
      .then((datos) => { if (!controlador.signal.aborted) setResumen(datos); })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) setErrorResumen(mensajeError(causa));
      })
      .finally(() => { if (!controlador.signal.aborted) setCargandoResumen(false); });
    return () => { controlador.abort(); };
  }, [revision]);

  function filtrar(texto: string, estado: FiltroTaller) {
    if (texto === busqueda && estado === filtro) return;
    consulta.current += 1;
    setLista([]);
    setError('');
    setCargando(true);
    setBusqueda(texto);
    setFiltro(estado);
  }

  function reintentar() {
    consulta.current += 1;
    setError('');
    setErrorResumen('');
    setCargando(true);
    setCargandoResumen(true);
    setRevision((valor) => valor + 1);
  }

  function actualizar(recepcion: DetalleRecepcion) {
    // El listado conserva solo el resumen; los accesorios viven en la ficha.
    const { accesorios: _accesorios, ...datos } = recepcion;
    consulta.current += 1;
    setLista((actual) => actual.map((item) => item.id === datos.id ? datos : item)
      .filter((item) => filtro === 'todas' || item.estado === filtro));
    setResumen((actual) => actual.some((item) => item.id === datos.id)
      ? actual.map((item) => item.id === datos.id ? datos : item)
      : [...actual, datos]);
    setError('');
    setErrorResumen('');
    setCargando(true);
    setRevision((valor) => valor + 1);
  }

  return {
    lista, filtro, busqueda, cargando, error, errorResumen, cargandoResumen,
    enTaller: resumen.filter((item) => item.estado === 'en_taller').length,
    entregadas: resumen.filter((item) => item.estado === 'entregada').length,
    filtrar, reintentar, actualizar,
  };
}
