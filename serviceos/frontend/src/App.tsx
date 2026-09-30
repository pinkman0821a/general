import AgendaPanel from './components/AgendaPanel'
import QuickAction from './components/QuickAction'
import Sidebar from './components/Sidebar'
import StatsGrid from './components/StatsGrid'
import TechniciansPanel from './components/TechniciansPanel'
import Topbar from './components/Topbar'

import './App.css'

function App() {
  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <Topbar />

        <StatsGrid />

        <section className="dashboard-grid">
          <AgendaPanel />
          <TechniciansPanel />
        </section>

        <QuickAction />
      </main>
    </div>
  )
}

export default App