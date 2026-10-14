import AgendaPanel from '../components/AgendaPanel'
import QuickAction from '../components/QuickAction'
import StatsGrid from '../components/StatsGrid'
import TechniciansPanel from '../components/TechniciansPanel'
import Topbar from '../components/Topbar'
import { useOperacion } from '../components/operacion/useOperacion'
import type { InicioOperacion } from '../services/agendaService'
import { mostrarFecha } from '../components/servicios/serviciosAyudas'
import '../styles/operacion.css'

function InicioPage() {
  const operacion = useOperacion<InicioOperacion>('/api/inicio/resumen');
  return (
    <section className="operacion-page inicio-page">
      <Topbar />
      {operacion.cargando ? <p role="status">Cargando resumen operativo…</p> : operacion.error ? <div role="alert">
        <p>{operacion.error}</p><button type="button" onClick={operacion.reintentar}>Reintentar Inicio</button></div> : operacion.datos && <>
        <p className="inicio-fecha">{mostrarFecha(operacion.datos.hoy)}</p>
        <StatsGrid datos={operacion.datos} />
        <section className="dashboard-grid">
          <AgendaPanel datos={operacion.datos} />
          <TechniciansPanel tecnicos={operacion.datos.tecnicos} />
        </section>
      </>}
      <QuickAction />
    </section>
  )
}

export default InicioPage
