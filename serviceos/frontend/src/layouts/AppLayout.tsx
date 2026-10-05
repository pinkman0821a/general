import { Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'

import GlobalTopbar from '../components/GlobalTopbar'
import Sidebar from '../components/Sidebar'

function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <GlobalTopbar />

        {children ?? <Outlet />}
      </main>
    </div>
  )
}

export default AppLayout
