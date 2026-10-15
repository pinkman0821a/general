import type { ResumenFinanzas as DatosResumen } from '../../services/finanzasService';
import { etiquetaMes, formatoCop, textoComparacion } from './finanzasAyudas';

export default function ResumenFinanzas({ datos }: { datos: DatosResumen }) {
  const { resumen, comparacion } = datos;
  return <>
    <div className="finanzas-kpis" aria-label="Totales del mes seleccionado">
      {[['Ingresos por servicios', formatoCop(resumen.ingresos_servicios)], ['Servicios con pago', resumen.servicios_con_pago],
        ['Técnicos con actividad', resumen.tecnicos_con_actividad], ['Promedio por servicio', formatoCop(resumen.promedio_por_servicio)]]
        .map(([nombre, valor]) => <div key={nombre} className="finanzas-kpi"><span>{nombre}</span><strong>{valor}</strong></div>)}
    </div>
    <div className="finanzas-comparacion">
      <span>Comparación de pagos a técnicos</span>
      <strong className={comparacion.diferencia >= 0 ? 'aumento' : 'descenso'}>{textoComparacion(comparacion)}</strong>
      <span>{etiquetaMes(comparacion.mes_anterior)}: {formatoCop(comparacion.pago_anterior)}</span>
      <span>Diferencia: {comparacion.diferencia > 0 ? '+' : ''}{formatoCop(comparacion.diferencia)}</span>
    </div>
  </>;
}
