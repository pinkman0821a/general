export type UsoIA = {
  fechaUtc: string;
  neuronsUsadas: number;
  neuronsRestantes: number;
  porcentajeRestante: number;
  tokensEntrada: number;
  tokensSalida: number;
  llamadas: number;
  limiteDiario: number;
};

export async function obtenerUsoIA() {
  const respuesta = await fetch("/api/uso-ia");

  if (!respuesta.ok) {
    throw new Error("No se pudo obtener el uso de IA");
  }

  return respuesta.json() as Promise<UsoIA>;
}