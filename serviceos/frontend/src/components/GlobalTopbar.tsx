import { Bell } from 'lucide-react'

import ApiStatus from './ApiStatus'
import SessionUserControl from './SessionUserControl'

function GlobalTopbar() {
  return (
    <header className="global-topbar">
      <div className="global-topbar-actions">
        <ApiStatus />

        <button
          className="icon-button"
          type="button"
          title="Notificaciones"
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        <SessionUserControl />
      </div>
    </header>
  )
}

export default GlobalTopbar