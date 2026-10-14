import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { DiaAgenda, ServicioAgenda } from '../../services/agendaService';
import { estadosServicio, mostrarFecha, tiposServicio } from '../servicios/serviciosAyudas';
import { descripcionTecnico, enlaceAgendaServicio, estadosAgenda } from './agendaAyudas';

function ServiciosDia({ servicios, titulo }: { servicios: ServicioAgenda[]; titulo: string }) {
  if (!servicios.length) return null;
  return <div className="agenda-trabajos"><h4>{titulo}</h4>{servicios.map(servicio => <article className="agenda-servicio" key={servicio.id}>
    <strong>{tiposServicio[servicio.tipo]}</strong><p>Cliente: {servicio.cliente_nombre}</p><p>Máquina: {servicio.maquina}</p>
    <p>Ciudad: {servicio.ciudad ?? 'REMOTO'}</p><span className={`agenda-servicio-estado ${servicio.estado}`}>{estadosServicio[servicio.estado]}</span>
    <Link to={enlaceAgendaServicio(servicio)}>Ver servicio →</Link>
  </article>)}</div>;
}

export default function DetalleDiaAgenda({ dia, tecnicoSeleccionado }: { dia: DiaAgenda; tecnicoSeleccionado?: number }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.focus(); }, [dia.fecha, tecnicoSeleccionado]);
  const tecnicos = tecnicoSeleccionado ? [...dia.tecnicos].sort((a, b) => Number(b.id === tecnicoSeleccionado) - Number(a.id === tecnicoSeleccionado)) : dia.tecnicos;
  const tieneServicios = dia.tecnicos.some(tecnico => tecnico.presenciales.length || tecnico.remotos.length);
  return <section className="agenda-detalle" ref={panel} tabIndex={-1} aria-label={`Detalle del ${mostrarFecha(dia.fecha)}`}>
    <h2>{mostrarFecha(dia.fecha)}</h2>{!tieneServicios && <p>Sin servicios programados.</p>}
    {!tecnicos.length && <p>No hay técnicos con actividad en esta fecha.</p>}
    <div className="agenda-detalle-tecnicos">{tecnicos.map(tecnico => <article key={tecnico.id}
      className={`agenda-ficha ${tecnico.id === tecnicoSeleccionado ? 'destacada' : ''}`}>
      <header><h3>{tecnico.nombre}{!tecnico.activo && <small> · Inactivo</small>}</h3>
        <span className={`agenda-estado ${tecnico.estado}`}>{estadosAgenda[tecnico.estado]}</span></header>
      <p>{descripcionTecnico(tecnico)}</p>
      <ServiciosDia servicios={tecnico.presenciales} titulo="Servicios presenciales" />
      <ServiciosDia servicios={tecnico.remotos} titulo="Servicios remotos · no ocupan agenda presencial" />
    </article>)}</div>
  </section>;
}
