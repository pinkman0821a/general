import "./App.css";
import Chat from "./features/chat/components/Chat";
import { NOVA_VERSION } from "./config/version";

function App() {
  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <div className="app-brand">
            <div className="app-logo" aria-hidden="true">N</div>
            <div>
              <div className="app-title-row">
                <h1>NOVA</h1>
                <span className="app-version">{NOVA_VERSION}</span>
              </div>
              <p>Tu inteligencia artificial personal.</p>
            </div>
          </div>

          <div className="app-status">
            <span className="app-status__dot" />
            En línea
          </div>
        </header>

        <Chat />
      </div>
    </main>
  );
}

export default App;
