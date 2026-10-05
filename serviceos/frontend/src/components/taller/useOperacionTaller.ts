import { useEffect, useRef, useState } from 'react';
import type { DetalleRecepcion } from '../../services/tallerService';
import { mensajeError } from './tallerAyudas';

export function useOperacionTaller(onOcupado: (ocupado: boolean) => void) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const bloqueado = useRef(false);
  const activo = useRef(false);

  useEffect(() => {
    activo.current = true;
    return () => { activo.current = false; };
  }, []);

  async function ejecutar(
    accion: () => Promise<DetalleRecepcion>,
    alGuardar: (recepcion: DetalleRecepcion) => void,
    confirmacion: string,
  ) {
    if (bloqueado.current || !activo.current) return;
    bloqueado.current = true;
    setGuardando(true);
    setError('');
    setMensaje('');
    onOcupado(true);
    try {
      const recepcion = await accion();
      if (activo.current) {
        setMensaje(confirmacion);
        alGuardar(recepcion);
      }
    } catch (errorOperacion) {
      if (activo.current) setError(mensajeError(errorOperacion));
    } finally {
      bloqueado.current = false;
      onOcupado(false);
      if (activo.current) setGuardando(false);
    }
  }

  return { guardando, error, mensaje, ejecutar };
}
