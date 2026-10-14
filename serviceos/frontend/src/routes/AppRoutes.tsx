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
import FinanzasPage from '../pages/FinanzasPage'
import InicioPage from '../pages/InicioPage'
import LoginPage from '../pages/LoginPage'
import TallerAcceso from '../components/taller/TallerAcceso'
import ServiciosAcceso from '../components/servicios/ServiciosAcceso'
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
        <Route path="/maquinas" element={<TallerAcceso />} />
        <Route path="/taller" element={<TallerAcceso />} />
        <Route path="/servicios" element={<ServiciosAcceso />} />
        <Route path="/servicios/:id" element={<ServiciosAcceso detalle />} />
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
              path="/tecnicos"
              element={<TecnicosPage />}
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
