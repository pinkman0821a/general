import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fechaLocal, moverMes } from '../servicios/serviciosAyudas';

export default function SelectorMesAgenda({ mes, cambiar }: { mes: string; cambiar: (mes: string) => void }) {
  return <div className="agenda-selector">
    <div><button type="button" aria-label="Mes anterior" disabled={mes === '0001-01'} onClick={() => cambiar(moverMes(mes, -1))}><ChevronLeft size={18} /></button>
      <strong>{fechaLocal(`${mes}-01`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</strong>
      <button type="button" aria-label="Mes siguiente" disabled={mes === '9999-12'} onClick={() => cambiar(moverMes(mes, 1))}><ChevronRight size={18} /></button></div>
    <label>Seleccionar mes<input type="month" min="0001-01" max="9999-12" value={mes} onChange={evento => {
      if (/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(evento.target.value)) cambiar(evento.target.value);
    }} /></label>
  </div>;
}
