import type { EstadoServicio as Estado } from '../../services/serviciosService';
import { estadosServicio } from './serviciosAyudas';

export default function EstadoServicio({ estado }: { estado: Estado }) {
  return <span className={`servicios-estado ${estado}`}>{estadosServicio[estado]}</span>;
}
