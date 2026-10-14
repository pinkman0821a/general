import { crearServicio, editarServicio, ErrorSobrecarga, type PayloadServicio, type Servicio } from '../../services/serviciosService';
import { mensajeError } from './serviciosAyudas';

export type AdvertenciaAgenda = {
  existentes: number;
  resultantes: number;
  tecnico: string;
  fecha: string;
};
export type EstadoOperacion = { guardando: boolean; error: string; advertencia: AdvertenciaAgenda | null };
type Accion = (confirmar: boolean) => Promise<Servicio>;

// Conserva una copia de la operación original durante la confirmación y bloquea envíos duplicados.
export function crearOperacionServicio(
  notificar: (estado: EstadoOperacion) => void, alGuardar: (servicio: Servicio) => void,
) {
  let estado: EstadoOperacion = { guardando: false, error: '', advertencia: null };
  let pendiente: { accion: Accion; contexto: Pick<AdvertenciaAgenda, 'tecnico' | 'fecha'> } | null = null;
  const publicar = (cambios: Partial<EstadoOperacion>) => {
    estado = { ...estado, ...cambios };
    notificar(estado);
  };
  async function enviar(accion: Accion, contexto: Pick<AdvertenciaAgenda, 'tecnico' | 'fecha'>, confirmar: boolean) {
    if (estado.guardando) return;
    publicar({ guardando: true, error: '' });
    try {
      const servicio = await accion(confirmar);
      pendiente = null;
      publicar({ advertencia: null, guardando: false });
      alGuardar(servicio);
    } catch (causa) {
      if (causa instanceof ErrorSobrecarga && !confirmar) {
        pendiente = { accion, contexto };
        publicar({ advertencia: { ...contexto, existentes: causa.existentes, resultantes: causa.resultantes } });
      } else {
        pendiente = null;
        publicar({ advertencia: null, error: mensajeError(causa) });
      }
    } finally {
      publicar({ guardando: false });
    }
  }
  return {
    guardar(id: number | undefined, datos: PayloadServicio, contexto: Pick<AdvertenciaAgenda, 'tecnico' | 'fecha'>,
      completar?: (servicio: Servicio) => Promise<Servicio>) {
      if (estado.guardando || pendiente) return Promise.resolve();
      const copia = { ...datos };
      const accion: Accion = async (confirmar) => {
        const payload = confirmar ? { ...copia, confirmar_sobrecarga: true } : { ...copia };
        const guardado = await (id === undefined ? crearServicio(payload) : editarServicio(id, payload));
        return completar ? completar(guardado) : guardado;
      };
      return enviar(accion, { ...contexto }, false);
    },
    ejecutar(accion: () => Promise<Servicio>) {
      if (estado.guardando || pendiente) return Promise.resolve();
      return enviar(accion, { tecnico: '', fecha: '' }, true);
    },
    confirmar() {
      if (!pendiente || estado.guardando) return Promise.resolve();
      return enviar(pendiente.accion, pendiente.contexto, true);
    },
    cancelar() {
      if (estado.guardando) return;
      pendiente = null;
      publicar({ advertencia: null, error: '' });
    },
  };
}
