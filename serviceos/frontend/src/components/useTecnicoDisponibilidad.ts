import { useEffect, useRef, useState } from "react";
import {
  crearIndisponibilidad, eliminarIndisponibilidad, listarIndisponibilidades,
  type Indisponibilidad,
} from "../services/disponibilidadService";
import { cambiarMes, construirCalendario, mesActual } from "./calendarioDisponibilidad";

function mensajeError(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la operación";
}

// La ficha monta el componente con key={tecnicoId}: cada técnico tiene su propio estado.
export function useTecnicoDisponibilidad(tecnicoId: number) {
  const [mes, setMes] = useState(mesActual);
  const [lista, setLista] = useState<Indisponibilidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorOperacion, setErrorOperacion] = useState("");
  const [operacion, setOperacion] = useState(false);
  const [seleccion, setSeleccion] = useState("");
  const [recarga, setRecarga] = useState(0);
  const activo = useRef(false);
  const bloqueado = useRef(false);
  const consulta = useRef(0);
  const calendario = construirCalendario(mes);

  useEffect(() => {
    activo.current = true;
    return () => { activo.current = false; };
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    const numero = ++consulta.current;
    const vigente = () => !controlador.signal.aborted && numero === consulta.current;
    listarIndisponibilidades(tecnicoId, calendario.desde, calendario.hasta, controlador.signal)
      .then((datos) => { if (vigente()) setLista(datos); })
      .catch((error: unknown) => { if (vigente()) setErrorCarga(mensajeError(error)); })
      .finally(() => { if (vigente()) setCargando(false); });
    return () => { controlador.abort(); };
  }, [tecnicoId, calendario.desde, calendario.hasta, recarga]);

  function prepararCarga() {
    consulta.current += 1;
    setLista([]);
    setSeleccion("");
    setErrorCarga("");
    setErrorOperacion("");
    setCargando(true);
  }

  function navegar(desplazamiento: number) {
    if (bloqueado.current) return;
    const siguiente = cambiarMes(mes, desplazamiento);
    if (siguiente.anio < 100 || siguiente.anio > 9999) return;
    prepararCarga();
    setMes(siguiente);
  }

  function reintentar() {
    if (bloqueado.current || cargando) return;
    prepararCarga();
    setRecarga((valor) => valor + 1);
  }

  function seleccionar(fecha: string) {
    if (bloqueado.current || cargando || errorCarga) return;
    setSeleccion(fecha);
    setErrorOperacion("");
  }

  async function guardar(motivo: string) {
    if (bloqueado.current || !activo.current || cargando || errorCarga || !seleccion) return;
    const fecha = seleccion;
    const existente = lista.some((item) => item.fecha === fecha);
    bloqueado.current = true;
    setOperacion(true);
    setErrorOperacion("");
    try {
      if (existente) {
        await eliminarIndisponibilidad(tecnicoId, fecha);
        if (activo.current) setLista((datos) => datos.filter((item) => item.fecha !== fecha));
      } else {
        const nueva = await crearIndisponibilidad(tecnicoId, fecha, motivo);
        if (activo.current) setLista((datos) => [...datos, nueva]);
      }
      if (activo.current) setSeleccion("");
    } catch (error) {
      if (activo.current) setErrorOperacion(mensajeError(error));
    } finally {
      bloqueado.current = false;
      if (activo.current) setOperacion(false);
    }
  }

  return {
    calendario, lista, cargando, errorCarga, errorOperacion, operacion,
    seleccion, seleccionar, navegar, reintentar, guardar,
  };
}
