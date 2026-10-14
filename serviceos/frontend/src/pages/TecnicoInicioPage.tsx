import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import SessionUserControl from '../components/SessionUserControl';
import DashboardTecnico from '../components/tecnico/DashboardTecnico';
import ComisionPersonal from '../components/tecnico/ComisionPersonal';
import { obtenerSesion, type UsuarioSesion } from '../services/authService';
import { listarServicios, type Servicio } from '../services/serviciosService';
import { mensajeError } from '../components/servicios/serviciosAyudas';
import '../styles/tecnicoInicio.css';
import '../styles/servicios.css';

export default function TecnicoInicioPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let vigente = true;
    obtenerSesion().then(sesion => { if (vigente) setUsuario(sesion); })
      .catch(() => { if (vigente) setUsuario(null); })
      .finally(() => { if (vigente) setSesionLista(true); });
    return () => { vigente = false; };
  }, []);
  useEffect(() => {
    if (usuario?.rol !== 'tecnico') return;
    const controlador = new AbortController();
    listarServicios({ mes: '', estado: '', tipo: '', tecnico_id: '', buscar: '' }, controlador.signal)
      .then(datos => { if (!controlador.signal.aborted) setServicios(datos); })
      .catch(causa => { if (!controlador.signal.aborted) setError(mensajeError(causa)); })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false); });
    return () => controlador.abort();
  }, [usuario, revision]);
  if (sesionLista && !usuario) return <Navigate to="/login" replace />;
  if (usuario?.rol === 'coordinador') return <Navigate to="/" replace />;
  return <main className="tecnico-page">
    <header className="tecnico-topbar"><div className="tecnico-brand"><strong>ServiceOS</strong><span>Panel técnico</span></div>
      <SessionUserControl /></header>
    <DashboardTecnico nombre={usuario?.nombre ?? ''} servicios={servicios} cargando={cargando} error={error}
      comision={<ComisionPersonal habilitado={usuario?.rol === 'tecnico'} />}
      reintentar={() => { setError(''); setCargando(true); setRevision(valor => valor + 1); }} />
  </main>;
}
