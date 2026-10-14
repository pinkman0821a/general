import { useState } from 'react';
import type { TecnicoFinanzas } from '../services/finanzasService';
import { mesActual } from '../components/servicios/serviciosAyudas';
import { useFinanzas } from '../components/finanzas/useFinanzas';
import MesFinanzas from '../components/finanzas/MesFinanzas';
import ResumenFinanzas from '../components/finanzas/ResumenFinanzas';
import RankingMensual from '../components/finanzas/RankingMensual';
import DetalleFinanzasTecnico from '../components/finanzas/DetalleFinanzasTecnico';
import '../styles/finanzas.css';

export default function FinanzasPage() {
  const [mes, setMes] = useState(mesActual);
  const [seleccionado, setSeleccionado] = useState<{ tecnico: TecnicoFinanzas; mes: string } | null>(null);
  const finanzas = useFinanzas(mes);
  function cambiarMes(valor: string) {
    setMes(valor); setSeleccionado(null);
  }
  return <section className="finanzas-page">
    <header className="finanzas-cabecera"><div><p className="eyebrow">Comisiones generadas · Todo el equipo</p>
      <h1>Finanzas</h1><p>Pago generado desde la asignación del servicio, en cualquier estado.</p></div>
      <MesFinanzas mes={mes} cambiar={cambiarMes} /></header>
    <p className="finanzas-ayuda">Estos valores representan comisiones generadas. No registran liquidaciones ni pagos efectuados.</p>
    {finanzas.cargando ? <div className="finanzas-carga" role="status">Cargando Finanzas del mes…</div>
      : finanzas.error ? <div className="finanzas-error" role="alert"><p>{finanzas.error}</p>
        <button type="button" onClick={finanzas.reintentar}>Reintentar Finanzas</button></div>
        : finanzas.datos && <>
          <ResumenFinanzas datos={finanzas.datos} />
          <div className={`finanzas-layout ${seleccionado ? 'con-detalle' : ''}`}>
            <RankingMensual historico={finanzas.datos.historico_tecnicos}
              seleccionar={(tecnico, mesDetalle) => setSeleccionado({ tecnico, mes: mesDetalle })} />
            {seleccionado && <DetalleFinanzasTecnico key={`${seleccionado.mes}-${seleccionado.tecnico.id}`} id={seleccionado.tecnico.id}
              nombre={seleccionado.tecnico.nombre} mes={seleccionado.mes} cerrar={() => setSeleccionado(null)} />}
          </div>
        </>}
  </section>;
}
