import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import SessionUserControl from '../SessionUserControl';
import AppLayout from '../../layouts/AppLayout';
import TallerPage from '../../pages/TallerPage';
import { obtenerSesion, type UsuarioSesion } from '../../services/authService';
import { mensajeError } from './tallerAyudas';
import { CatalogoAccesoriosProveedor } from './CatalogoAccesoriosContexto';
import '../../styles/tecnicoInicio.css';
import '../../styles/taller.css';

export default function TallerAcceso() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    obtenerSesion()
      .then((sesion) => { if (activo) setUsuario(sesion); })
      .catch((causa: unknown) => { if (activo) setError(mensajeError(causa)); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [intento]);

  if (cargando) return <p className="auth-loading" role="status">Comprobando permisos...</p>;
  if (error) return (
    <div className="taller-page taller-acceso-error">
      <p className="taller-error" role="alert">{error}</p>
      <button type="button" onClick={() => {
        setError('');
        setCargando(true);
        setIntento((valor) => valor + 1);
      }}>Reintentar</button>
    </div>
  );
  if (!usuario) return <Navigate to="/login" replace />;

  const pagina = <TallerPage usuario={usuario} />;
  if (usuario.rol === 'coordinador') return <AppLayout>
    <CatalogoAccesoriosProveedor>{pagina}</CatalogoAccesoriosProveedor>
  </AppLayout>;

  return (
    <main className="tecnico-page">
      <header className="tecnico-topbar">
        <div className="tecnico-brand">
          <strong>ServiceOS</strong>
          <Link to="/tecnico">Volver a mi inicio</Link>
        </div>
        <SessionUserControl />
      </header>
      <div className="taller-tecnico-content">{pagina}</div>
    </main>
  );
}
