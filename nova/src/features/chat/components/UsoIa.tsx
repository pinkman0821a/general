import { useEffect, useState } from "react";
import { obtenerUsoIA, type UsoIA } from "../services/usoIaService";
import "../styles/UsoIa.css";

function formatearNumero(valor: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(valor);
}

function UsoIa({ actualizacion }: { actualizacion: number }) {
  const [uso, setUso] = useState<UsoIA | null>(null);

  useEffect(() => {
    async function cargarUso() {
      try {
        setUso(await obtenerUsoIA());
      } catch (error) {
        console.error("[NOVA] Error obteniendo uso de IA:", error);
      }
    }

    cargarUso();
  }, [actualizacion]);

  if (!uso) {
    return <div className="uso-ia uso-ia--cargando">⚡ Calculando</div>;
  }

  const porcentaje = Math.max(0, Math.min(100, uso.porcentajeRestante));

  return (
    <section className="uso-ia" title={`${formatearNumero(uso.neuronsUsadas)} Neurons usadas · ${uso.llamadas} llamadas`}>
      <div className="uso-ia__fila">
        <span className="uso-ia__icono">⚡</span>
        <div className="uso-ia__info">
          <span className="uso-ia__titulo">Neurons</span>
          <strong>{formatearNumero(uso.neuronsRestantes)}</strong>
        </div>
        <span className="uso-ia__porcentaje">{formatearNumero(porcentaje)}%</span>
      </div>
      <div className="uso-ia__barra">
        <div className="uso-ia__progreso" style={{ width: `${porcentaje}%` }} />
      </div>
    </section>
  );
}

export default UsoIa;
