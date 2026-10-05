import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import type { UsuarioSesion } from '../services/authService';
import type { DetalleRecepcion, FiltroTaller } from '../services/tallerService';
import DetalleTaller from '../components/taller/DetalleTaller';
import FormularioRecepcion from '../components/taller/FormularioRecepcion';
import ListaTaller from '../components/taller/ListaTaller';
import { useTaller } from '../components/taller/useTaller';
import CatalogoAccesorios from '../components/taller/CatalogoAccesorios';

const filtros: [FiltroTaller, string][] = [
  ['en_taller', 'En taller'], ['entregada', 'Entregadas'], ['todas', 'Todas'],
];

export default function TallerPage({ usuario }: { usuario: UsuarioSesion }) {
  const taller = useTaller();
  const coordinador = usuario.rol === 'coordinador';
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const panelAbierto = creando || seleccionado !== null;

  function cerrar() {
    if (ocupado) return;
    setSeleccionado(null);
    setCreando(false);
  }

  function actualizar(recepcion: DetalleRecepcion) {
    taller.actualizar(recepcion);
    setMensaje(creando ? 'Equipo recibido correctamente.' : 'Recepción actualizada correctamente.');
    setCreando(false);
    setSeleccionado(recepcion.id);
  }

  return (
    <div className={`taller-page ${coordinador ? 'taller-coordinador' : 'taller-tecnico'}`}>
      <header className="taller-cabecera">
        <div>
          <p className="eyebrow">Recepción de equipos</p>
          <h1>Taller</h1>
          <p className="taller-ayuda">Equipos que los clientes traen a la oficina para revisión o reparación.</p>
        </div>
        {coordinador && <button type="button" className="taller-primario" disabled={ocupado || creando}
          onClick={() => { setCreando(true); setSeleccionado(null); setMensaje(''); }}>
          <Plus size={17} />Recibir equipo
        </button>}
      </header>
      <div className="taller-indicadores" aria-label="Resumen del Taller">
        <span>En taller <strong>{taller.cargandoResumen || taller.errorResumen ? '—' : taller.enTaller}</strong></span>
        <span>Entregadas <strong>{taller.cargandoResumen || taller.errorResumen ? '—' : taller.entregadas}</strong></span>
      </div>
      {taller.errorResumen && <div className="taller-fila">
        <p className="taller-error" role="alert">No se pudieron actualizar los indicadores: {taller.errorResumen}</p>
        <button type="button" disabled={ocupado || taller.cargando} onClick={taller.reintentar}>Reintentar</button>
      </div>}
      <div className="taller-toolbar">
        <label className="taller-busqueda">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={taller.busqueda} disabled={ocupado}
            placeholder="Buscar cliente, teléfono, máquina..."
            aria-label="Buscar por cliente, teléfono, máquina, marca o modelo"
            onChange={(evento) => {
              cerrar();
              taller.filtrar(evento.target.value, taller.filtro);
              setMensaje('');
            }} />
        </label>
        <div className="taller-filtros" aria-label="Filtrar por estado">
          {filtros.map(([valor, etiqueta]) => (
            <button type="button" key={valor} disabled={ocupado} aria-pressed={taller.filtro === valor}
              className={taller.filtro === valor ? 'active' : ''} onClick={() => {
                cerrar();
                taller.filtrar(taller.busqueda, valor);
                setMensaje('');
              }}>{etiqueta}</button>
          ))}
        </div>
      </div>
      <p className="taller-ayuda taller-busqueda-ayuda">Busca por cliente, teléfono, máquina, marca o modelo.</p>
      {coordinador && <CatalogoAccesorios bloqueado={ocupado} />}
      {mensaje && <p className="taller-exito" role="status">{mensaje}</p>}
      <div className={`taller-layout ${panelAbierto ? 'con-panel' : ''}`}>
        <ListaTaller lista={taller.lista} cargando={taller.cargando} error={taller.error}
          seleccionado={seleccionado} ocupado={ocupado} reintentar={taller.reintentar}
          abrir={(id) => { if (!ocupado) { setSeleccionado(id); setCreando(false); setMensaje(''); } }} />
        {creando && coordinador ? (
          <FormularioRecepcion alGuardar={actualizar} cancelar={cerrar} onOcupado={setOcupado} />
        ) : seleccionado !== null ? (
          <DetalleTaller key={seleccionado} id={seleccionado} coordinador={coordinador}
            ocupado={ocupado} cerrar={cerrar} alGuardar={actualizar} onOcupado={setOcupado} />
        ) : <p className="taller-sin-seleccion taller-ayuda">Abre una recepción para consultar los accesorios y gestionar la entrega.</p>}
      </div>
    </div>
  );
}
