import type { MensajeConversacion } from "./aiService.js";
import { analizarMemoriaRapida } from "./memoriaRapidaService.js";

type Candidato = {
  id: number;
  valor: string;
};

function normalizar(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function obtenerArticulo(entidad: string) {
  return normalizar(entidad).endsWith("a") ? "La" : "El";
}

function coincideRespuesta(respuesta: string, valor: string) {
  const texto = normalizar(respuesta);
  const referencia = normalizar(valor);

  return (
    texto === referencia ||
    texto === `la ${referencia}` ||
    texto === `el ${referencia}` ||
    texto.split(" ").includes(referencia)
  );
}

export async function resolverAclaracionPendiente(
  db: D1Database,
  mensajes: MensajeConversacion[],
) {
  if (mensajes.length < 3) {
    return null;
  }

  const ultimos = mensajes.slice(-3);

  const mensajeOriginal = ultimos[0];
  const aclaracionNova = ultimos[1];
  const respuestaUsuario = ultimos[2];

  if (
    mensajeOriginal.autor !== "usuario" ||
    aclaracionNova.autor !== "nova" ||
    respuestaUsuario.autor !== "usuario"
  ) {
    return null;
  }

  const textoAclaracion = normalizar(aclaracionNova.texto);

  if (
    !textoAclaracion.includes("a cual") ||
    !textoAclaracion.includes("te refieres")
  ) {
    return null;
  }

  const analisis = analizarMemoriaRapida(mensajeOriginal.texto);

  if (analisis.usarIA || analisis.memorias.length !== 1) {
    return null;
  }

  const memoria = analisis.memorias[0];

  if (!memoria.entidad || memoria.referencia) {
    return null;
  }

  const resultado = await db
    .prepare(
      `
      SELECT
        e.id,
        m.valor
      FROM entidades e
      INNER JOIN memorias m
        ON m.entidad_id = e.id
      WHERE e.estado = 'activa'
        AND m.estado = 'activa'
        AND LOWER(e.tipo) = LOWER(?)
        AND LOWER(e.nombre_base) = LOWER(?)
        AND LOWER(m.clave) = LOWER(?)
      ORDER BY e.id ASC
    `,
    )
    .bind(memoria.tipo, memoria.entidad, memoria.clave)
    .all<Candidato>();

  const coincidencias = resultado.results.filter((candidato) =>
    coincideRespuesta(respuestaUsuario.texto, candidato.valor),
  );

  if (coincidencias.length !== 1) {
    return null;
  }

  const candidato = coincidencias[0];

  const articulo = obtenerArticulo(memoria.entidad);

  return `${articulo} ${memoria.entidad} ${candidato.valor} ahora es ${memoria.valor}.`;
}
