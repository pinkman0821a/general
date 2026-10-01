import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import AuthGate from '../components/AuthGate'
import CoordinadorGate from '../components/CoordinadorGate'
import AppLayout from '../layouts/AppLayout'
import AgendaPage from '../pages/AgendaPage'
import AjustesPage from '../pages/AjustesPage'
import ClientesPage from '../pages/ClientesPage'
import FinanzasPage from '../pages/FinanzasPage'
import InicioPage from '../pages/InicioPage'
import LoginPage from '../pages/LoginPage'
import MaquinasPage from '../pages/MaquinasPage'
import ServiciosPage from '../pages/ServiciosPage'
import TecnicoInicioPage from '../pages/TecnicoInicioPage'
import TecnicosPage from '../pages/TecnicosPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route element={<AuthGate />}>
        <Route
          path="/tecnico"
          element={<TecnicoInicioPage />}
        />

        <Route element={<CoordinadorGate />}>
          <Route element={<AppLayout />}>
            <Route
              path="/"
              element={<InicioPage />}
            />

            <Route
              path="/agenda"
              element={<AgendaPage />}
            />

            <Route
              path="/servicios"
              element={<ServiciosPage />}
            />

            <Route
              path="/tecnicos"
              element={<TecnicosPage />}
            />

            <Route
              path="/clientes"
              element={<ClientesPage />}
            />

            <Route
              path="/maquinas"
              element={<MaquinasPage />}
            />

            <Route
              path="/finanzas"
              element={<FinanzasPage />}
            />

            <Route
              path="/ajustes"
              element={<AjustesPage />}
            />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  )
}