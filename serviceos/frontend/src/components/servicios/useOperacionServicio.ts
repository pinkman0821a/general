import { useEffect, useRef, useState } from 'react';
import type { Servicio } from '../../services/serviciosService';
import { crearOperacionServicio, type EstadoOperacion } from './operacionServicio';

export function useOperacionServicio(alGuardar: (servicio: Servicio) => void, onOcupado: (ocupado: boolean) => void) {
  const [estado, setEstado] = useState<EstadoOperacion>({ guardando: false, error: '', advertencia: null });
  const activo = useRef(false);
  const callbacks = useRef({ alGuardar, onOcupado });
  const operacion = useRef<ReturnType<typeof crearOperacionServicio> | null>(null);
  useEffect(() => { callbacks.current = { alGuardar, onOcupado }; }, [alGuardar, onOcupado]);
  useEffect(() => {
    activo.current = true;
    operacion.current = crearOperacionServicio(
      (nuevo) => {
        if (!activo.current) return;
        setEstado(nuevo);
        callbacks.current.onOcupado(nuevo.guardando || nuevo.advertencia !== null);
      },
      (servicio) => { if (activo.current) callbacks.current.alGuardar(servicio); },
    );
    return () => { activo.current = false; operacion.current = null; };
  }, []);
  return {
    ...estado,
    guardar: (...args: Parameters<ReturnType<typeof crearOperacionServicio>['guardar']>) => operacion.current?.guardar(...args),
    ejecutar: (accion: () => Promise<Servicio>) => operacion.current?.ejecutar(accion),
    confirmar: () => operacion.current?.confirmar(),
    cancelar: () => operacion.current?.cancelar(),
  };
}
