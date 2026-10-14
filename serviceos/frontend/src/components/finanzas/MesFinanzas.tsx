import { ChevronLeft, ChevronRight } from 'lucide-react';
import { moverMes } from '../servicios/serviciosAyudas';
import { etiquetaMes } from './finanzasAyudas';

export default function MesFinanzas({ mes, cambiar }: { mes: string; cambiar: (mes: string) => void }) {
  return <div className="finanzas-mes" aria-label="Mes de Finanzas">
    <div className="finanzas-mes-navegacion">
      <button type="button" aria-label="Mes anterior" disabled={mes === '0001-01'} onClick={() => cambiar(moverMes(mes, -1))}>
        <ChevronLeft size={19} /></button>
      <strong>{etiquetaMes(mes)}</strong>
      <button type="button" aria-label="Mes siguiente" disabled={mes === '9999-12'} onClick={() => cambiar(moverMes(mes, 1))}>
        <ChevronRight size={19} /></button>
    </div>
    <label>Seleccionar mes<input type="month" min="0001-01" max="9999-12" value={mes}
      onChange={evento => { if (/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(evento.target.value)) cambiar(evento.target.value); }} /></label>
  </div>;
}
