export type UsoTokens = {
  prompt_tokens?: number;
  completion_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

export type UsoIADiario = {
  fechaUtc: string;
  neuronsUsadas: number;
  neuronsRestantes: number;
  porcentajeRestante: number;
  tokensEntrada: number;
  tokensSalida: number;
  llamadas: number;
  limiteDiario: number;
};

const LIMITE_DIARIO = 10000;
const NEURONS_ENTRADA_POR_MILLON = 13778;
const NEURONS_SALIDA_POR_MILLON = 26128;

function obtenerFechaUtc() {
  return new Date().toISOString().slice(0, 10);
}

function obtenerTokensEntrada(usage: UsoTokens) {
  return Math.max(0, Number(usage.prompt_tokens ?? usage.input_tokens ?? 0));
}

function obtenerTokensSalida(usage: UsoTokens) {
  return Math.max(
    0,
    Number(usage.completion_tokens ?? usage.output_tokens ?? 0),
  );
}

function calcularNeurons(tokensEntrada: number, tokensSalida: number) {
  const entrada = (tokensEntrada / 1_000_000) * NEURONS_ENTRADA_POR_MILLON;

  const salida = (tokensSalida / 1_000_000) * NEURONS_SALIDA_POR_MILLON;

  return entrada + salida;
}

export async function registrarUsoIA(db: D1Database, usage: UsoTokens) {
  const tokensEntrada = obtenerTokensEntrada(usage);

  const tokensSalida = obtenerTokensSalida(usage);

  const neurons = calcularNeurons(tokensEntrada, tokensSalida);

  if (tokensEntrada === 0 && tokensSalida === 0) {
    return;
  }

  const fechaUtc = obtenerFechaUtc();

  await db
    .prepare(
      `
      INSERT INTO uso_ia_diario (
        fecha_utc,
        neurons_usadas,
        tokens_entrada,
        tokens_salida,
        llamadas
      )
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(fecha_utc)
      DO UPDATE SET
        neurons_usadas =
          neurons_usadas + excluded.neurons_usadas,
        tokens_entrada =
          tokens_entrada + excluded.tokens_entrada,
        tokens_salida =
          tokens_salida + excluded.tokens_salida,
        llamadas =
          llamadas + 1,
        actualizada_en =
          CURRENT_TIMESTAMP
    `,
    )
    .bind(fechaUtc, neurons, tokensEntrada, tokensSalida)
    .run();
}

export async function obtenerUsoIAHoy(db: D1Database): Promise<UsoIADiario> {
  const fechaUtc = obtenerFechaUtc();

  const fila = await db
    .prepare(
      `
      SELECT
        fecha_utc,
        neurons_usadas,
        tokens_entrada,
        tokens_salida,
        llamadas
      FROM uso_ia_diario
      WHERE fecha_utc = ?
      LIMIT 1
    `,
    )
    .bind(fechaUtc)
    .first<{
      fecha_utc: string;
      neurons_usadas: number;
      tokens_entrada: number;
      tokens_salida: number;
      llamadas: number;
    }>();

  const neuronsUsadas = Number(fila?.neurons_usadas ?? 0);

  const neuronsRestantes = Math.max(0, LIMITE_DIARIO - neuronsUsadas);

  const porcentajeRestante = (neuronsRestantes / LIMITE_DIARIO) * 100;

  return {
    fechaUtc,
    neuronsUsadas,
    neuronsRestantes,
    porcentajeRestante,
    tokensEntrada: Number(fila?.tokens_entrada ?? 0),
    tokensSalida: Number(fila?.tokens_salida ?? 0),
    llamadas: Number(fila?.llamadas ?? 0),
    limiteDiario: LIMITE_DIARIO,
  };
}
