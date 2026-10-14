import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { UsuarioSesion } from '../services/authService';
import type { Servicio } from '../services/serviciosService';
import { listarTecnicos, type Tecnico } from '../services/tecnicosService';
import DetalleServicio from '../components/servicios/DetalleServicio';
import FormularioServicio from '../components/servicios/FormularioServicio';
import { mensajeError } from '../components/servicios/serviciosAyudas';
import { volverAlListado } from '../components/servicios/serviciosNavegacion';
import '../styles/servicios.css';

export default function ServicioDetallePage({ usuario }: { usuario: UsuarioSesion }) {
  const { id: parametro } = useParams();
  const id = Number(parametro);
  const navigate = useNavigate(), location = useLocation();
  const destino = volverAlListado(location.state);
  const coordinador = usuario.rol === 'coordinador';
  const [edicion, setEdicion] = useState<Servicio | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [revision, setRevision] = useState(0);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [cargandoTecnicos, setCargandoTecnicos] = useState(coordinador);
  const [errorTecnicos, setErrorTecnicos] = useState('');
  const [intento, setIntento] = useState(0);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (!coordinador) return;
    let activo = true;
    listarTecnicos().then(datos => { if (activo) setTecnicos(datos); })
      .catch(causa => { if (activo) setErrorTecnicos(mensajeError(causa)); })
      .finally(() => { if (activo) setCargandoTecnicos(false); });
    return () => { activo = false; };
  }, [coordinador, intento]);
  function volver() { if (!ocupado) navigate(destino); }
  function guardar(_servicio: Servicio, aviso?: string) {
    setMensaje(aviso ?? 'Servicio actualizado correctamente.');
    if (edicion) { setEdicion(null); setRevision(valor => valor + 1); }
  }
  return <div className={`servicios-page servicios-detalle-page ${coordinador ? 'servicios-coordinador' : 'servicios-tecnico'}`}>
    {coordinador && <button type="button" className="servicio-detalle-atras" disabled={ocupado} onClick={volver}>
      <ArrowLeft size={19} aria-hidden="true" />Atrás</button>}
    {mensaje && <p className="servicios-exito" role="status">{mensaje}</p>}
    {!/^\d+$/.test(parametro ?? '') || !Number.isSafeInteger(id) || id <= 0
      ? <p className="servicios-error" role="alert">ID de servicio inválido.</p>
      : edicion && coordinador ? <FormularioServicio key={`editar-${id}`} servicio={edicion}
        tecnicos={tecnicos.filter(tecnico => tecnico.activo === 1)} cargandoTecnicos={cargandoTecnicos} errorTecnicos={errorTecnicos}
        cancelar={() => { if (!ocupado) setEdicion(null); }} alGuardar={guardar} onOcupado={setOcupado}
        alEliminar={() => navigate(destino, { replace: true, state: { mensajeServicios: 'Servicio eliminado correctamente.' } })} />
        : <DetalleServicio key={`${id}-${revision}`} id={id} coordinador={coordinador} tecnicos={tecnicos}
          cerrar={volver} editar={servicio => { if (coordinador && !ocupado) { setMensaje(''); setEdicion(servicio); } }}
          alGuardar={guardar} onOcupado={setOcupado}
          alEliminar={() => navigate(destino, { replace: true, state: { mensajeServicios: 'Servicio eliminado correctamente.' } })} />}
    {coordinador && errorTecnicos && <div className="servicios-acciones">
      <p role="alert" className="servicios-error">{errorTecnicos}</p>
      <button type="button" disabled={ocupado} onClick={() => { setErrorTecnicos(''); setCargandoTecnicos(true); setIntento(valor => valor + 1); }}>Reintentar técnicos</button>
    </div>}
  </div>;
}
