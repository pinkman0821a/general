import { responderConsultaDirecta } from "./consultaDirectaService.js";
import { responderResumenEntidad } from "./consultaResumenEntidadService.js";
import { analizarMemoriaRapida } from "./memoriaRapidaService.js";

type CandidatoEntidad = {
  id: number;
  valor: string | null;
};

function normalizar(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function articuloEntidad(entidad: string) {
  const nombre = normalizar(entidad);

  return nombre.endsWith("a") ? "la" : "el";
}

function unirOpciones(opciones: string[]) {
  if (opciones.length === 1) {
    return opciones[0];
  }

  if (opciones.length === 2) {
    return `${opciones[0]} o ${opciones[1]}`;
  }

  return `${opciones.slice(0, -1).join(", ")} o ${opciones.at(-1)}`;
}

async function responderAmbiguedad(db: D1Database, mensaje: string) {
  const analisis = analizarMemoriaRapida(mensaje);

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
      LEFT JOIN memorias m
        ON m.entidad_id = e.id
        AND m.estado = 'activa'
        AND LOWER(m.clave) = LOWER(?)
      WHERE e.estado = 'activa'
        AND LOWER(e.tipo) = LOWER(?)
        AND LOWER(e.nombre_base) = LOWER(?)
      ORDER BY e.id ASC
    `,
    )
    .bind(memoria.clave, memoria.tipo, memoria.entidad)
    .all<CandidatoEntidad>();

  if (resultado.results.length <= 1) {
    return null;
  }

  const candidatos = resultado.results.filter(
    (candidato) =>
      typeof candidato.valor === "string" && candidato.valor.trim() !== "",
  );

  if (candidatos.length !== resultado.results.length) {
    return `¿A cuál ${memoria.entidad} te refieres? Tienes más de una.`;
  }

  const valores = candidatos.map((candidato) => candidato.valor!.trim());

  const valoresUnicos = [...new Set(valores.map(normalizar))];

  if (valoresUnicos.length !== valores.length) {
    return `¿A cuál ${memoria.entidad} te refieres? Tienes más de una.`;
  }

  const articulo = articuloEntidad(memoria.entidad);

  const opciones = valores.map((valor) =>
    articulo === "la" ? `a la ${valor}` : `al ${valor}`,
  );

  return `¿A cuál ${memoria.entidad} te refieres, ${unirOpciones(opciones)}?`;
}

export async function responderDirectamente(db: D1Database, mensaje: string) {
  const consulta = await responderConsultaDirecta(db, mensaje);

  if (consulta) {
    return consulta;
  }

  const resumen = await responderResumenEntidad(db, mensaje);

  if (resumen) {
    return resumen;
  }

  return responderAmbiguedad(db, mensaje);
}
