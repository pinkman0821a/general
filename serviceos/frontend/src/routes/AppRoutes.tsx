import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import AppLayout from '../layouts/AppLayout'
import AgendaPage from '../pages/AgendaPage'
import AjustesPage from '../pages/AjustesPage'
import ClientesPage from '../pages/ClientesPage'
import FinanzasPage from '../pages/FinanzasPage'
import InicioPage from '../pages/InicioPage'
import MaquinasPage from '../pages/MaquinasPage'
import ServiciosPage from '../pages/ServiciosPage'
import TecnicosPage from '../pages/TecnicosPage'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<InicioPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="servicios" element={<ServiciosPage />} />
        <Route path="tecnicos" element={<TecnicosPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="maquinas" element={<MaquinasPage />} />
        <Route path="finanzas" element={<FinanzasPage />} />
        <Route path="ajustes" element={<AjustesPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes