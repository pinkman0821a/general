import type { FiltrosServicio, EstadoServicio, TipoServicio } from '../../services/serviciosService';
import type { Tecnico } from '../../services/tecnicosService';
import { estadosServicio, fechaLocal, moverMes, tiposServicio } from './serviciosAyudas';

type Props = { filtros: FiltrosServicio; coordinador: boolean; tecnicos: Tecnico[];
  ocupado: boolean; cambiar: (filtros: FiltrosServicio) => void };
export default function FiltrosServicios({ filtros, coordinador, tecnicos, ocupado, cambiar }: Props) {
  const actualizar = (cambios: Partial<FiltrosServicio>) => cambiar({ ...filtros, ...cambios });
  return <fieldset className="servicios-filtros" disabled={ocupado}>
    <legend className="servicios-sr">Filtros de servicios</legend>
    <div className="servicios-mes">
      <span>{fechaLocal(`${filtros.mes}-01`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</span>
      <div className="servicios-acciones">
        <button type="button" aria-label="Mes anterior" disabled={filtros.mes === '0001-01'}
          onClick={() => actualizar({ mes: moverMes(filtros.mes, -1) })}>‹</button>
        <label><span className="servicios-sr">Mes</span><input type="month" value={filtros.mes} min="0001-01" max="9999-12"
          onChange={(evento) => { if (/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(evento.target.value)) actualizar({ mes: evento.target.value }); }} /></label>
        <button type="button" aria-label="Mes siguiente" disabled={filtros.mes === '9999-12'}
          onClick={() => actualizar({ mes: moverMes(filtros.mes, 1) })}>›</button>
      </div>
    </div>
    <label>Estado<select value={filtros.estado} onChange={(evento) => actualizar({ estado: evento.target.value as EstadoServicio | '' })}>
      <option value="">Todos</option>{Object.entries(estadosServicio).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
    </select></label>
    <label>Tipo<select value={filtros.tipo} onChange={(evento) => actualizar({ tipo: evento.target.value as TipoServicio | '' })}>
      <option value="">Todos</option>{Object.entries(tiposServicio).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
    </select></label>
    {coordinador && <label>Técnico<select value={filtros.tecnico_id} onChange={(evento) => actualizar({ tecnico_id: evento.target.value })}>
      <option value="">Todos</option>{tecnicos.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.activo ? '' : ' (inactivo)'}</option>)}
    </select></label>}
    <label className="servicios-busqueda">Buscar<input type="search" value={filtros.buscar} placeholder="Cliente, teléfono, máquina…"
      onChange={(evento) => actualizar({ buscar: evento.target.value })} /></label>
  </fieldset>;
}
