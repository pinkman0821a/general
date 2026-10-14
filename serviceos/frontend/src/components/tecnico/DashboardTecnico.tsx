import { ArrowRight, CalendarDays, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Servicio } from '../../services/serviciosService';
import { mostrarFecha, tiposServicio } from '../servicios/serviciosAyudas';
import EstadoServicio from '../servicios/EstadoServicio';
import { enlaceServicio, resumenTecnico } from './resumenTecnico';

function DatosProximo({ servicio }: { servicio: Servicio }) {
  return <>
    <div className="tecnico-fecha"><CalendarDays size={17} />{mostrarFecha(servicio.fecha_programada)}</div>
    <h3>{servicio.cliente_nombre}</h3>
    <p>{tiposServicio[servicio.tipo]} · {servicio.maquina}</p>
    <p>{servicio.ciudad ?? 'REMOTO'}</p>
    <EstadoServicio estado={servicio.estado} />
  </>;
}

export default function DashboardTecnico({ nombre, servicios, cargando, error, reintentar, comision }: {
  nombre: string; servicios: Servicio[]; cargando: boolean; error: string; reintentar: () => void; comision?: ReactNode;
}) {
  const resumen = resumenTecnico(servicios);
  const siguiente = resumen.proximos[0];
  const disponible = !cargando && !error;
  return <section className="tecnico-content">
    <div className="tecnico-introduccion"><div className="tecnico-saludo"><h1>Hola, {nombre.trim().split(/\s+/)[0] || 'Técnico'}</h1>
      <p>Este es tu resumen de trabajo.</p></div>{comision}</div>
    <div className="tecnico-kpis" aria-label="Resumen de mi trabajo">
      {[['Pendientes', resumen.pendientes, 'pendiente'], ['En proceso', resumen.enProceso, 'en_proceso'],
        ['Realizados este mes', resumen.realizadosMes, 'realizado'], ['Servicios de hoy', resumen.serviciosHoy, 'hoy']]
        .map(([etiqueta, valor, clase]) => <div key={etiqueta} className={`tecnico-kpi ${clase}`}>
          <span>{etiqueta}</span><strong>{disponible ? valor : '—'}</strong>
        </div>)}
    </div>
    {error && <div role="alert" className="tecnico-error"><p>{error}</p><button onClick={reintentar}>Reintentar</button></div>}
    <div className="tecnico-operacion">
      <section className="tecnico-bloque tecnico-prioritario">
        <p className="tecnico-etiqueta">Tu agenda</p><h2>Próximo servicio</h2>
        {cargando ? <p role="status">Cargando trabajos…</p> : error ? <p>No se pudo consultar tu agenda.</p>
          : siguiente ? <><DatosProximo servicio={siguiente} />
            <Link className="tecnico-boton" to={enlaceServicio(siguiente)}>Ver servicio<ArrowRight size={17} /></Link></>
            : <p>Sin servicios próximos</p>}
      </section>
      <section className="tecnico-bloque">
        <h2>Próximos trabajos</h2>
        {disponible && resumen.proximos.map(servicio => <Link className="tecnico-trabajo" key={servicio.id} to={enlaceServicio(servicio)}>
          <span>{mostrarFecha(servicio.fecha_programada, true)}</span>
          <div><strong>{servicio.cliente_nombre}</strong><small>{tiposServicio[servicio.tipo]} · {servicio.ciudad ?? 'REMOTO'}</small></div>
          <ArrowRight size={17} />
        </Link>)}
        {disponible && !resumen.proximos.length && <p>Tu agenda no tiene trabajos próximos.</p>}
        <Link className="tecnico-boton secundario" to="/servicios">Ver todos los servicios<ArrowRight size={17} /></Link>
      </section>
      <section className="tecnico-bloque tecnico-taller">
        <Wrench size={23} /><div><h2>Oficina</h2><p>Recepción y entrega de equipos</p></div>
        <Link className="tecnico-boton secundario" to="/taller">Ir a Oficina<ArrowRight size={17} /></Link>
      </section>
    </div>
  </section>;
}
