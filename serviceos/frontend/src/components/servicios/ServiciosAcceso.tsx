import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { obtenerSesion, type UsuarioSesion } from '../../services/authService';
import AppLayout from '../../layouts/AppLayout';
import TecnicoTopbarSecundario from '../TecnicoTopbarSecundario';
import ServiciosPage from '../../pages/ServiciosPage';
import ServicioDetallePage from '../../pages/ServicioDetallePage';
import { volverAlListado } from './serviciosNavegacion';
import { mensajeError } from './serviciosAyudas';
import '../../styles/tecnicoInicio.css';

export default function ServiciosAcceso({ detalle = false }: { detalle?: boolean } = {}) {
  const location = useLocation();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let activo = true;
    obtenerSesion().then((sesion) => { if (activo) setUsuario(sesion); })
      .catch((causa: unknown) => { if (activo) setError(mensajeError(causa)); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [revision]);
  if (cargando) return <p className="auth-loading" role="status">Comprobando permisos…</p>;
  if (error) return <div className="servicios-page servicios-acceso-error">
    <p className="servicios-error" role="alert">{error}</p><button type="button" onClick={() => {
      setError(''); setCargando(true); setRevision((valor) => valor + 1);
    }}>Reintentar</button></div>;
  if (!usuario) return <Navigate to="/login" replace />;
  const pagina = detalle ? <ServicioDetallePage key={location.pathname} usuario={usuario} /> : <ServiciosPage usuario={usuario} />;
  if (usuario.rol === 'coordinador') return <AppLayout>{pagina}</AppLayout>;
  return <main className="tecnico-page">
    <TecnicoTopbarSecundario destino={detalle ? volverAlListado(location.state) : '/tecnico'} />
    <div className={`servicios-tecnico-content ${detalle ? 'servicios-detalle-content' : ''}`}>{pagina}</div>
  </main>;
}
