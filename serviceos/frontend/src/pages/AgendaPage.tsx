import { useState } from 'react';
import type { AgendaMes } from '../services/agendaService';
import { mesActual } from '../components/servicios/serviciosAyudas';
import { useOperacion } from '../components/operacion/useOperacion';
import CalendarioAgenda from '../components/operacion/CalendarioAgenda';
import SelectorMesAgenda from '../components/operacion/SelectorMesAgenda';
import DetalleDiaAgenda from '../components/operacion/DetalleDiaAgenda';
import '../styles/operacion.css';
import '../styles/agenda.css';

export default function AgendaPage() {
  const [mes, setMes] = useState(mesActual);
  const [seleccion, setSeleccion] = useState<{ fecha: string; tecnico?: number } | null>(null);
  const operacion = useOperacion<AgendaMes>(`/api/agenda?${new URLSearchParams({ mes })}`);
  const fecha = seleccion?.fecha ?? (operacion.datos?.hoy.startsWith(mes) ? operacion.datos.hoy : `${mes}-01`);
  const dia = operacion.datos?.dias.find(valor => valor.fecha === fecha);
  return <section className="operacion-page agenda-page">
    <header className="operacion-cabecera"><div><p className="eyebrow">Programación · Todo el equipo</p><h1>Agenda</h1>
      <p>Disponibilidad presencial y trabajos asignados por día.</p></div>
      <SelectorMesAgenda mes={mes} cambiar={valor => { setMes(valor); setSeleccion(null); }} /></header>
    {operacion.cargando ? <p role="status">Cargando agenda…</p> : operacion.error ? <div role="alert"><p>{operacion.error}</p>
      <button type="button" onClick={operacion.reintentar}>Reintentar agenda</button></div> : operacion.datos && <>
      <CalendarioAgenda datos={operacion.datos} seleccionado={fecha} seleccionar={(fecha, tecnico) => setSeleccion({ fecha, tecnico })} />
      {dia && <DetalleDiaAgenda dia={dia} tecnicoSeleccionado={seleccion?.tecnico} />}
    </>}
  </section>;
}
