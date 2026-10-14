import type { ResumenFinanzas, TecnicoFinanzas } from '../../services/finanzasService';
import { etiquetaMes, formatoCop } from './finanzasAyudas';

export default function RankingMensual({ historico, seleccionar }: {
  historico: ResumenFinanzas['historico_tecnicos']; seleccionar: (tecnico: TecnicoFinanzas, mes: string) => void;
}) {
  return <div className="finanzas-rankings">{historico.map(({ mes, tecnicos }) => {
    const maximo = tecnicos[0]?.pago_generado ?? 0;
    return <section className="finanzas-ranking" key={mes} aria-label={`Ranking ${etiquetaMes(mes)}`}>
      <h2>{etiquetaMes(mes)}</h2>
      {!tecnicos.length ? <p>Sin comisiones generadas este mes.</p> : <ol>
        {tecnicos.map((tecnico, indice) => <li key={tecnico.id}>
          <button type="button" className="finanzas-ranking-fila" onClick={() => seleccionar(tecnico, mes)}
            aria-label={`${indice + 1}. ${tecnico.nombre}, ${formatoCop(tecnico.pago_generado)}, ver detalle de ${etiquetaMes(mes)}`}>
            <span className="finanzas-posicion">{indice + 1}</span>
            <span className="finanzas-ranking-nombre">{tecnico.nombre}{!tecnico.activo && <small>Inactivo</small>}</span>
            <span className="finanzas-barra-fondo" aria-hidden="true"><span style={{ width: `${tecnico.pago_generado / maximo * 100}%` }} /></span>
            <strong>{formatoCop(tecnico.pago_generado)}</strong>
          </button>
        </li>)}
      </ol>}
    </section>;
  })}</div>;
}
