import { fechaLocal } from '../servicios/serviciosAyudas';
import type { ResumenFinanzas } from '../../services/finanzasService';

export function formatoCop(valor: number) {
  return `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(valor)}`;
}

export function etiquetaMes(mes: string, corta = false) {
  return fechaLocal(`${mes}-01`).toLocaleDateString('es-CO', corta ? { month: 'short' } : { month: 'long', year: 'numeric' });
}

export function textoComparacion(comparacion: ResumenFinanzas['comparacion']) {
  if (comparacion.porcentaje === null) return comparacion.pago_anterior === 0 && comparacion.diferencia === 0
    ? 'Sin pago generado en ambos meses' : 'Mes anterior sin pago generado · Sin base para calcular porcentaje';
  const signo = comparacion.porcentaje > 0 ? '+' : '';
  return `${signo}${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    .format(comparacion.porcentaje)}% frente al mes anterior`;
}
