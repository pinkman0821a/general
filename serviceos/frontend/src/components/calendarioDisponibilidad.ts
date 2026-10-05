export type MesCalendario = { anio: number; mes: number };

export const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function mesActual(): MesCalendario {
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
}

// UTC se usa solo para aritmética y etiquetas; las fechas de API siguen siendo cadenas.
export function cambiarMes(mes: MesCalendario, desplazamiento: number): MesCalendario {
  const fecha = new Date(Date.UTC(mes.anio, mes.mes + desplazamiento, 1));
  return { anio: fecha.getUTCFullYear(), mes: fecha.getUTCMonth() };
}

export function construirCalendario(mes: MesCalendario) {
  const primero = new Date(Date.UTC(mes.anio, mes.mes, 1));
  const dias = new Date(Date.UTC(mes.anio, mes.mes + 1, 0)).getUTCDate();
  const inicio = (primero.getUTCDay() + 6) % 7;
  const prefijo = `${String(mes.anio).padStart(4, "0")}-${String(mes.mes + 1).padStart(2, "0")}`;
  const fechaDia = (dia: number) => `${prefijo}-${String(dia).padStart(2, "0")}`;
  const celdas = Array.from({ length: Math.ceil((inicio + dias) / 7) * 7 }, (_, indice) => {
    const dia = indice - inicio + 1;
    return dia > 0 && dia <= dias ? { dia, fecha: fechaDia(dia) } : null;
  });
  const titulo = primero.toLocaleDateString("es-CO", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
  return { celdas, titulo, desde: fechaDia(1), hasta: fechaDia(dias) };
}

export function mostrarFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}
