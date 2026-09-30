import AgendaPanel from '../components/AgendaPanel'
import QuickAction from '../components/QuickAction'
import StatsGrid from '../components/StatsGrid'
import TechniciansPanel from '../components/TechniciansPanel'
import Topbar from '../components/Topbar'

function InicioPage() {
  return (
    <>
      <Topbar />

      <StatsGrid />

      <section className="dashboard-grid">
        <AgendaPanel />
        <TechniciansPanel />
      </section>

      <QuickAction />
    </>
  )
}

export default InicioPage