import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { UsuarioSesion } from '../services/authService';
import type { FiltrosServicio, Servicio } from '../services/serviciosService';
import { useServicios } from '../components/servicios/useServicios';
import { estadosServicio } from '../components/servicios/serviciosAyudas';
import { filtrosDesdeUrl, parametrosFiltros } from '../components/servicios/serviciosNavegacion';
import FiltrosServicios from '../components/servicios/FiltrosServicios';
import ListaServicios from '../components/servicios/ListaServicios';
import FormularioServicio from '../components/servicios/FormularioServicio';
import '../styles/servicios.css';
import ComisionesMes from '../components/servicios/ComisionesMes';
import '../styles/comisiones.css';

export default function ServiciosPage({ usuario }: { usuario: UsuarioSesion }) {
  const coordinador = usuario.rol === 'coordinador';
  const [parametros, setParametros] = useSearchParams();
  const navigate = useNavigate(), location = useLocation();
  const iniciales = filtrosDesdeUrl(parametros);
  const servicios = useServicios(coordinador, iniciales.mes, iniciales.estado, iniciales);
  const [formulario, setFormulario] = useState(() => coordinador && parametros.get('nuevo') === '1');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(() => typeof location.state?.mensajeServicios === 'string' ? location.state.mensajeServicios : '');
  const [revisionPagos, setRevisionPagos] = useState(0);
  function limpiarNuevo() {
    if (!parametros.has('nuevo')) return;
    const siguientes = new URLSearchParams(parametros);
    siguientes.delete('nuevo');
    setParametros(siguientes, { replace: true });
  }
  function cerrar() {
    if (ocupado) return;
    setFormulario(false);
    limpiarNuevo();
  }
  function filtrar(filtros: FiltrosServicio) {
    if (ocupado) return;
    cerrar(); setMensaje(''); servicios.filtrar(filtros);
    setParametros(parametrosFiltros(filtros), { replace: true });
  }
  function actualizar(servicio: Servicio, aviso?: string) {
    setRevisionPagos(valor => valor + 1);
    servicios.actualizar(servicio);
    setMensaje(aviso ?? 'Servicio actualizado correctamente.');
    setFormulario(false);
    limpiarNuevo();
    navigate(`/servicios/${servicio.id}`, { state: { volverServicios: `/servicios?${parametrosFiltros(servicios.filtros)}` } });
  }
  // Conserva enlaces antiguos sin volver a montar detalle dentro del listado.
  const anteriorId = Number(parametros.get('servicio'));
  if (Number.isSafeInteger(anteriorId) && anteriorId > 0) {
    return <Navigate to={`/servicios/${anteriorId}`} replace
      state={{ volverServicios: `/servicios?${parametrosFiltros(servicios.filtros)}` }} />;
  }
  return <div className={`servicios-page ${coordinador ? 'servicios-coordinador' : 'servicios-tecnico'}`}>
    <header className="servicios-cabecera">
      <div><p className="eyebrow">Operación · Trabajos asignados</p><h1>Servicios</h1>
        <p className="servicios-ayuda">{coordinador ? 'Programa y gestiona los servicios de tu equipo.' : 'Consulta y actualiza tus trabajos asignados.'}</p>
      </div>
      {coordinador && <button type="button" className="servicios-primario" disabled={ocupado || formulario}
        onClick={() => { setFormulario(true); setMensaje(''); }}><Plus size={17} />Nuevo servicio</button>}
    </header>
    <ComisionesMes mes={servicios.filtros.mes} coordinador={coordinador} revision={revisionPagos} />
    <p className="servicios-ayuda">Resumen de resultados visibles · Mes seleccionado</p>
    <div className="servicios-indicadores" aria-label="Resumen de resultados visibles">
      {Object.entries(estadosServicio).map(([estado, etiqueta]) => <div key={estado} className={estado}>
        <span>{estado === 'pendiente' ? 'Pendientes' : estado === 'realizado' ? 'Realizados' : etiqueta}</span>
        <strong>{servicios.cargando || servicios.error ? '—' : servicios.cuentas[estado as keyof typeof servicios.cuentas]}</strong>
      </div>)}
    </div>
    <FiltrosServicios filtros={servicios.filtros} coordinador={coordinador} tecnicos={servicios.tecnicos}
      ocupado={ocupado} cambiar={filtrar} />
    {servicios.errorTecnicos && <div className="servicios-acciones">
      <p className="servicios-error" role="alert">{servicios.errorTecnicos}</p>
      <button type="button" disabled={ocupado} onClick={servicios.reintentarTecnicos}>Reintentar técnicos</button>
    </div>}
    {mensaje && <p className="servicios-exito" role="status">{mensaje}</p>}
    <div className={`servicios-layout ${formulario ? 'con-panel' : ''}`}>
      <ListaServicios lista={servicios.lista} cargando={servicios.cargando} error={servicios.error}
        seleccionado={null} ocupado={ocupado} coordinador={coordinador} tecnicos={servicios.tecnicos}
        reintentar={servicios.reintentar} abrir={(id) => {
          if (ocupado) return;
          navigate(`/servicios/${id}`, { state: { volverServicios: `/servicios?${parametrosFiltros(servicios.filtros)}` } });
        }} />
      {formulario && coordinador && <FormularioServicio key="nuevo"
        tecnicos={servicios.tecnicos.filter((item) => item.activo === 1)} cargandoTecnicos={servicios.cargandoTecnicos}
        errorTecnicos={servicios.errorTecnicos} cancelar={cerrar} onOcupado={setOcupado} alGuardar={actualizar} />}
    </div>
  </div>;
}
