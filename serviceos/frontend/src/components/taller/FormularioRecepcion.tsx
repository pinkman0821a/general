import { useId, useState, type FormEvent } from 'react';
import {
  crearRecepcion, editarRecepcion, type DatosIngreso, type DetalleRecepcion,
} from '../../services/tallerService';
import ChecklistAccesorios from './ChecklistAccesorios';
import { fechaHoy } from './tallerAyudas';
import { useOperacionTaller } from './useOperacionTaller';

type Campo = {
  nombre: Exclude<keyof DatosIngreso, 'accesorios'>;
  etiqueta: string;
  requerido?: boolean;
  tipo?: 'date' | 'tel';
  multilinea?: boolean;
};

const secciones: { titulo: string; campos: Campo[] }[] = [
  { titulo: 'Datos del cliente', campos: [
    { nombre: 'cliente_nombre', etiqueta: 'Nombre / empresa', requerido: true },
    { nombre: 'cliente_contacto', etiqueta: 'Persona de contacto' },
    { nombre: 'cliente_telefono', etiqueta: 'Teléfono', requerido: true, tipo: 'tel' },
  ] },
  { titulo: 'Datos de la máquina', campos: [
    { nombre: 'maquina_tipo', etiqueta: 'Tipo', requerido: true },
    { nombre: 'maquina_tamano', etiqueta: 'Tamaño' },
    { nombre: 'maquina_marca', etiqueta: 'Marca' },
    { nombre: 'maquina_modelo', etiqueta: 'Modelo' },
  ] },
  { titulo: 'Ingreso', campos: [
    { nombre: 'fecha_ingreso', etiqueta: 'Fecha de ingreso', requerido: true, tipo: 'date' },
    { nombre: 'falla_reportada', etiqueta: 'Falla reportada', requerido: true, multilinea: true },
    { nombre: 'observaciones', etiqueta: 'Observaciones', multilinea: true },
  ] },
];

type Props = {
  recepcion?: DetalleRecepcion;
  alGuardar: (recepcion: DetalleRecepcion) => void;
  cancelar: () => void;
  onOcupado: (ocupado: boolean) => void;
};

export default function FormularioRecepcion({ recepcion, alGuardar, cancelar, onOcupado }: Props) {
  const id = useId();
  const [nombres, setNombres] = useState(() => recepcion?.accesorios.map((item) => item.nombre) ?? []);
  const [errorValidacion, setErrorValidacion] = useState('');
  const operacion = useOperacionTaller(onOcupado);

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (operacion.guardando) return;
    const formulario = new FormData(evento.currentTarget);
    const datos = { accesorios: nombres } as DatosIngreso;
    // Solo estos campos de ingreso pueden enviarse; nunca estado, entrega o IDs.
    for (const seccion of secciones) {
      for (const campo of seccion.campos) {
        const valor = String(formulario.get(campo.nombre) ?? '').trim();
        if (campo.requerido && !valor) {
          setErrorValidacion(`${campo.etiqueta} es obligatorio.`);
          return;
        }
        Object.assign(datos, { [campo.nombre]: valor || null });
      }
    }
    setErrorValidacion('');
    void operacion.ejecutar(
      () => recepcion ? editarRecepcion(recepcion.id, datos) : crearRecepcion(datos),
      alGuardar,
      recepcion ? 'Datos de recepción actualizados.' : 'Equipo recibido.',
    );
  }

  return (
    <section className="taller-panel">
      <h2>{recepcion ? 'Editar recepción' : 'Recibir equipo'}</h2>
      <p className="taller-ayuda">Los campos con * son obligatorios.</p>
      <form className="taller-formulario" onSubmit={guardar} aria-busy={operacion.guardando}>
        <fieldset disabled={operacion.guardando} className="taller-form-contenido">
          {secciones.map((seccion) => (
            <section className="taller-seccion" key={seccion.titulo}>
              <h3>{seccion.titulo}</h3>
              <div className="taller-campos">
                {seccion.campos.map((campo) => {
                  const valor = recepcion?.[campo.nombre] ?? (campo.tipo === 'date' ? fechaHoy() : '');
                  return (
                    <label key={campo.nombre} className={campo.multilinea ? 'taller-campo-amplio' : ''}
                      htmlFor={`${id}-${campo.nombre}`}>
                      <span>{campo.etiqueta}{campo.requerido && ' *'}</span>
                      {campo.multilinea ? (
                        <textarea id={`${id}-${campo.nombre}`} name={campo.nombre}
                          required={campo.requerido} defaultValue={valor} rows={3} />
                      ) : (
                        <input id={`${id}-${campo.nombre}`} name={campo.nombre}
                          type={campo.tipo ?? 'text'} required={campo.requerido} defaultValue={valor}
                          max={campo.tipo === 'date' ? recepcion?.fecha_entrega ?? '9999-12-31' : undefined}
                          min={campo.tipo === 'date' ? '0001-01-01' : undefined} />
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
          <section className="taller-seccion taller-accesorios-destacados">
            <h3>Accesorios recibidos</h3>
            <ChecklistAccesorios nombres={nombres} registrados={recepcion?.accesorios.map((item) => item.nombre)} cambiar={setNombres} />
          </section>
        </fieldset>
        {(errorValidacion || operacion.error) && (
          <p className="taller-error" role="alert">{errorValidacion || operacion.error}</p>
        )}
        <div className="taller-acciones">
          <button type="button" disabled={operacion.guardando} onClick={cancelar}>Cancelar</button>
          <button type="submit" className="taller-primario" disabled={operacion.guardando}>
            {operacion.guardando ? (recepcion ? 'Guardando cambios...' : 'Recibiendo equipo...')
              : (recepcion ? 'Guardar cambios' : 'Guardar recepción')}
          </button>
        </div>
      </form>
    </section>
  );
}
