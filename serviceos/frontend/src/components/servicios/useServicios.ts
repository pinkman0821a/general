import { useEffect, useRef, useState } from 'react';
import { listarServicios, type EstadoServicio, type FiltrosServicio, type Servicio } from '../../services/serviciosService';
import { listarTecnicos, type Tecnico } from '../../services/tecnicosService';
import { contarEstados, mensajeError, mesActual } from './serviciosAyudas';

export function useServicios(coordinador: boolean, mesInicial = mesActual(), estadoInicial: EstadoServicio | '' = '',
  iniciales: Partial<Pick<FiltrosServicio, 'tipo' | 'tecnico_id' | 'buscar'>> = {}) {
  const [filtros, setFiltros] = useState<FiltrosServicio>({ mes: mesInicial, estado: estadoInicial, tipo: '', tecnico_id: '', buscar: '', ...iniciales });
  const [lista, setLista] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const consulta = useRef(0);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [cargandoTecnicos, setCargandoTecnicos] = useState(coordinador);
  const [errorTecnicos, setErrorTecnicos] = useState('');
  const [revisionTecnicos, setRevisionTecnicos] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    const numero = ++consulta.current;
    const vigente = () => !controlador.signal.aborted && numero === consulta.current;
    const temporizador = window.setTimeout(() => {
      listarServicios(filtros, controlador.signal)
        .then((datos) => { if (vigente()) setLista(datos); })
        .catch((causa: unknown) => { if (vigente()) setError(mensajeError(causa)); })
        .finally(() => { if (vigente()) setCargando(false); });
    }, filtros.buscar ? 250 : 0);
    return () => { window.clearTimeout(temporizador); controlador.abort(); };
  }, [filtros, revision]);

  useEffect(() => {
    if (!coordinador) return;
    let activo = true;
    listarTecnicos().then((datos) => { if (activo) setTecnicos(datos); })
      .catch((causa: unknown) => { if (activo) setErrorTecnicos(mensajeError(causa)); })
      .finally(() => { if (activo) setCargandoTecnicos(false); });
    return () => { activo = false; };
  }, [coordinador, revisionTecnicos]);

  function filtrar(nuevos: FiltrosServicio) {
    consulta.current += 1;
    setLista([]); setCargando(true); setError(''); setFiltros(nuevos);
  }
  function reintentar() {
    consulta.current += 1;
    setCargando(true); setError(''); setRevision((valor) => valor + 1);
  }
  function actualizar(servicio: Servicio) {
    consulta.current += 1;
    setLista((actual) => actual.map((item) => item.id === servicio.id ? servicio : item)
      .filter((item) => !filtros.estado || item.estado === filtros.estado));
    setError(''); setRevision((valor) => valor + 1);
  }
  function reintentarTecnicos() {
    setErrorTecnicos(''); setCargandoTecnicos(true); setRevisionTecnicos((valor) => valor + 1);
  }
  function eliminar(id: number) {
    consulta.current += 1;
    setLista(actual => actual.filter(item => item.id !== id));
    setError(''); setRevision(valor => valor + 1);
  }
  return { filtros, lista, cargando, error, tecnicos, cargandoTecnicos, errorTecnicos, reintentarTecnicos,
    cuentas: contarEstados(lista), filtrar, actualizar, eliminar, reintentar };
}
