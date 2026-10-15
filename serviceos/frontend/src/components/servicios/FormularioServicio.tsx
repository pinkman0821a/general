import { useState, type FormEvent } from 'react';
import type { Servicio, TipoServicio } from '../../services/serviciosService';
import type { Tecnico } from '../../services/tecnicosService';
import { admiteValor, esPresencial, mensajeError, requiereFalla, tiposServicio } from './serviciosAyudas';
import { cambiarTipo, construirPayload, valoresIniciales, type ValoresFormulario } from './formularioServicioAyudas';
import { useOperacionServicio } from './useOperacionServicio';
import AlertaSobrecarga from './AlertaSobrecarga';
import { useFotosEdicion } from './fotos/useFotosEdicion';
import EditorFotos from './fotos/EditorFotos';
import EliminarServicio from './EliminarServicio';

type Props = {
  servicio?: Servicio; tecnicos: Tecnico[]; cargandoTecnicos: boolean; errorTecnicos: string;
  cancelar: () => void; alGuardar: (servicio: Servicio, aviso?: string) => void; onOcupado: (ocupado: boolean) => void;
  alEliminar?: (id: number) => void;
};
export default function FormularioServicio(props: Props) {
  const [valores, setValores] = useState(() => valoresIniciales(props.servicio));
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState<Servicio | null>(null);
  const [ocupadoEliminacion, setOcupadoEliminacion] = useState(false);
  const fotos = useFotosEdicion(props.servicio?.id);
  const operacion = useOperacionServicio(servicio => props.alGuardar(servicio, fotos.aviso.current), props.onOcupado);
  const bloqueado = operacion.guardando || operacion.advertencia !== null || ocupadoEliminacion;
  const cambiar = (campo: keyof ValoresFormulario, valor: string) => {
    setValores((actual) => ({ ...actual, [campo]: valor }));
  };
  async function completar(servicio: Servicio) {
    setGuardado(servicio);
    try { await fotos.guardar(servicio.id); }
    catch (causa) { throw new Error(`El servicio #${servicio.id} ya quedó guardado. No se completaron las fotos: ${mensajeError(causa)} Pulsa Guardar para reintentar sin duplicarlo.`); }
    return servicio;
  }
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (bloqueado || !fotos.listaLista) return;
    setError('');
    try {
      if (guardado) { await operacion.ejecutar(() => completar(guardado)); return; }
      const payload = construirPayload(valores, props.servicio);
      if (!Object.keys(payload).length) {
        if (props.servicio && fotos.cambios()) await operacion.ejecutar(() => completar(props.servicio!));
        else setError('No hay cambios para guardar.');
        return;
      }
      await operacion.guardar(props.servicio?.id, payload, {
        fecha: valores.fecha_programada,
        tecnico: props.tecnicos.find((item) => item.id === Number(valores.tecnico_id))?.nombre ?? 'El técnico asignado',
      }, completar);
    } catch (causa) { setError(mensajeError(causa)); }
  }
  function campo(nombre: keyof Omit<ValoresFormulario, 'tipo'>, etiqueta: string, obligatorio = false,
    placeholder = '', tipo = 'text') {
    return <label>{etiqueta}{obligatorio && ' *'}
      <input name={nombre} type={tipo} value={valores[nombre]} required={obligatorio} placeholder={placeholder}
        onChange={(evento) => cambiar(nombre, evento.target.value)} />
    </label>;
  }
  const tecnicoActual = props.servicio && !props.tecnicos.some((item) => item.id === props.servicio?.tecnico_id);
  return <section className="servicios-panel">
    <h2>{props.servicio ? 'Editar servicio' : 'Nuevo servicio'}</h2>
    <p className="servicios-ayuda">Los campos con * son obligatorios. Asignación manual de técnico.</p>
    <form onSubmit={guardar}>
      <fieldset disabled={bloqueado || !!guardado} className="servicios-campos">
        <label>Tipo *<select name="tipo" value={valores.tipo} required onChange={(evento) =>
          setValores((actual) => cambiarTipo(actual, evento.target.value as TipoServicio))}>
          {Object.entries(tiposServicio).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
        </select></label>
        {campo('fecha_programada', 'Fecha programada', true, '', 'date')}
        {campo('cliente_nombre', 'Nombre cliente', true)}
        {campo('cliente_telefono', 'Teléfono', true, '', 'tel')}
        <label>Técnico *<select name="tecnico_id" value={valores.tecnico_id} required
          disabled={props.cargandoTecnicos || !!props.errorTecnicos} onChange={(evento) => cambiar('tecnico_id', evento.target.value)}>
          <option value="">{props.cargandoTecnicos ? 'Cargando técnicos…' : 'Selecciona un técnico activo'}</option>
          {tecnicoActual && <option value={props.servicio!.tecnico_id} disabled>Técnico #{props.servicio!.tecnico_id} (inactivo)</option>}
          {props.tecnicos.filter((item) => item.activo === 1).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select></label>
        {admiteValor(valores.tipo) && <label>Valor del servicio (COP) *
          <input name="valor_servicio" type="text" inputMode="numeric" pattern="[0-9]+" required
            placeholder="250000" value={valores.valor_servicio} onChange={(evento) => cambiar('valor_servicio', evento.target.value)} />
        </label>}
        {esPresencial(valores.tipo) && <>
          {campo('ciudad', 'Ciudad', true)}{campo('direccion', 'Dirección', true)}
        </>}
        {campo('maquina', 'Máquina', true, 'Plotter ecosolvente 1.80 m')}
        {requiereFalla(valores.tipo) && campo('tipo_falla', 'Tipo de falla', true, 'Caída de color negro')}
        <label className="servicios-campo-amplio">Observaciones
          <textarea name="observaciones" value={valores.observaciones} rows={3}
            onChange={(evento) => cambiar('observaciones', evento.target.value)} />
        </label>
        <EditorFotos fotos={fotos} servicioId={props.servicio?.id} bloqueado={bloqueado || !!guardado} />
      </fieldset>
      {guardado && !operacion.guardando && <p role="status" className="servicios-ayuda">El servicio #{guardado.id} está guardado. Sus datos quedan bloqueados mientras reintentas las fotos pendientes.</p>}
      {(error || operacion.error || props.errorTecnicos) && <p className="servicios-error" role="alert">
        {error || operacion.error || props.errorTecnicos}</p>}
      {!props.cargandoTecnicos && !props.errorTecnicos && !props.tecnicos.length &&
        <p className="servicios-error" role="alert">No hay técnicos activos para asignar.</p>}
      <div className="servicios-acciones">
        <button type="button" disabled={bloqueado} onClick={() => { fotos.liberar(); if (guardado)
          props.alGuardar(guardado, 'Servicio guardado. No se confirmó el guardado de sus fotos pendientes; revisa el detalle antes de reintentar.'); else props.cancelar(); }}>{guardado ? 'Cerrar servicio guardado' : 'Cancelar'}</button>
        <button type="submit" className="servicios-primario" disabled={bloqueado || !fotos.listaLista || props.cargandoTecnicos || !!props.errorTecnicos}>
          {operacion.guardando ? 'Guardando…' : props.servicio ? 'Guardar cambios' : 'Guardar servicio'}</button>
      </div>
    </form>
    {props.servicio && props.alEliminar && <EliminarServicio id={props.servicio.id} coordinador ocupado={bloqueado}
      alEliminar={id => { fotos.liberar(); props.alEliminar?.(id); }}
      onOcupado={valor => { setOcupadoEliminacion(valor); props.onOcupado(valor); }} />}
    {operacion.advertencia && <AlertaSobrecarga advertencia={operacion.advertencia} guardando={operacion.guardando}
      confirmar={() => { void operacion.confirmar(); }} cancelar={operacion.cancelar} />}
  </section>;
}
