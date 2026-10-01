import { Outlet } from 'react-router-dom'

import GlobalTopbar from '../components/GlobalTopbar'
import Sidebar from '../components/Sidebar'

function AppLayout() {
  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <GlobalTopbar />

        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout