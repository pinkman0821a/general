import ApiStatus from './ApiStatus'
import SessionUserControl from './SessionUserControl'

function GlobalTopbar() {
  return (
    <header className="global-topbar">
      <div className="global-topbar-actions">
        <ApiStatus />

        <SessionUserControl />
      </div>
    </header>
  )
}

export default GlobalTopbar
