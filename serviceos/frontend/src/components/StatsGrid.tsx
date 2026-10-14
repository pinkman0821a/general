import { CalendarDays, CheckCircle2, PlayCircle, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { InicioOperacion } from '../services/agendaService';

function StatsGrid({ datos }: { datos: InicioOperacion }) {
  const mes = datos.hoy.slice(0, 7);
  const resumen = [
    { titulo: 'Servicios de hoy', valor: datos.resumen.servicios_hoy, icono: CalendarDays, ruta: `/servicios?mes=${mes}` },
    { titulo: 'En proceso', valor: datos.resumen.en_proceso, icono: PlayCircle, ruta: `/servicios?mes=${mes}&estado=en_proceso` },
    { titulo: 'Realizados hoy', valor: datos.resumen.realizados, icono: CheckCircle2, ruta: `/servicios?mes=${mes}&estado=realizado` },
    { titulo: 'Técnicos libres hoy', valor: datos.resumen.tecnicos_libres, icono: UsersRound, ruta: '/agenda' },
  ];
  return (
    <section className="stats">
      {resumen.map((item) => {
        const Icono = item.icono

        return (
          <Link className="stat-card" key={item.titulo} to={item.ruta}>
            <div className="stat-top">
              <div className="stat-icon">
                <Icono size={20} />
              </div>

              <span>{item.titulo}</span>
            </div>

            <strong>{item.valor}</strong>
            <small>Consultar →</small>
          </Link>
        )
      })}
    </section>
  )
}

export default StatsGrid
