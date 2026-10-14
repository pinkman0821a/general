import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SessionUserControl from './SessionUserControl';
import '../styles/tecnicoTopbarSecundario.css';

export default function TecnicoTopbarSecundario({ destino = '/tecnico' }: { destino?: string } = {}) {
  const navigate = useNavigate();
  return <header className="tecnico-topbar tecnico-topbar-secundario">
    <div className="tecnico-navegacion">
      <button type="button" className="tecnico-atras" onClick={() => navigate(destino)}>
        <ArrowLeft size={19} aria-hidden="true" />Atrás
      </button>
      <div className="tecnico-brand"><strong>ServiceOS</strong></div>
    </div>
    <SessionUserControl />
  </header>;
}
