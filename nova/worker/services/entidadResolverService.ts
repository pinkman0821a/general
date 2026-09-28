import {
  buscarEntidadesActivas,
  buscarEntidadesActivasPorTipo,
  crearEntidad,
} from "./entidadService.js";
import { obtenerMemoriasPorEntidadId } from "./memoriaService.js";

type DatosEntidad = {
  tipo: string;
  entidad: string | null;
  referencia?: string | null;
  clave: string;
  valor: string;
};

const INDICADORES_ANTES_ENTIDAD = [
  "otra",
  "otro",
  "segunda",
  "segundo",
  "tercera",
  "tercer",
  "nueva",
  "nuevo",
];

const INDICADORES_DESPUES_ENTIDAD = ["nueva", "nuevo", "mas"];

function normalizar(texto: string | null | undefined) {
  return (texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function escaparRegex(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function esEntidadNueva(mensaje: string, entidad: string) {
  const texto = normalizar(mensaje);
  const entidadNormalizada = normalizar(entidad);

  if (!texto || !entidadNormalizada) {
    return false;
  }

  const entidadRegex = escaparRegex(entidadNormalizada);

  const antes = new RegExp(
    `\\b(?:${INDICADORES_ANTES_ENTIDAD.join("|")})\\s+${entidadRegex}\\b`,
  );

  const despues = new RegExp(
    `\\b${entidadRegex}\\s+(?:${INDICADORES_DESPUES_ENTIDAD.join("|")})\\b`,
  );

  return antes.test(texto) || despues.test(texto);
}

async function buscarPorReferencia(
  db: D1Database,
  entidades: Awaited<ReturnType<typeof buscarEntidadesActivas>>,
  referencia: string,
) {
  const referenciaNormalizada = normalizar(referencia);

  const activas: number[] = [];
  const historicas: number[] = [];

  for (const entidad of entidades) {
    const memorias = await obtenerMemoriasPorEntidadId(db, entidad.id);

    const coincideActiva = memorias.some(
      (memoria) =>
        memoria.estado === "activa" &&
        normalizar(memoria.valor) === referenciaNormalizada,
    );

    if (coincideActiva) {
      activas.push(entidad.id);
      continue;
    }

    const coincideHistorica = memorias.some(
      (memoria) =>
        memoria.estado !== "activa" &&
        normalizar(memoria.valor) === referenciaNormalizada,
    );

    if (coincideHistorica) {
      historicas.push(entidad.id);
    }
  }

  const activasUnicas = [...new Set(activas)];

  if (activasUnicas.length === 1) {
    return activasUnicas[0];
  }

  if (activasUnicas.length > 1) {
    return null;
  }

  const historicasUnicas = [...new Set(historicas)];

  if (historicasUnicas.length === 1) {
    return historicasUnicas[0];
  }

  return null;
}

async function buscarEntidadCompuesta(
  db: D1Database,
  tipo: string,
  descripcion: string,
) {
  const descripcionNormalizada = normalizar(descripcion);

  const entidades = await buscarEntidadesActivasPorTipo(db, tipo);

  const nombresBase = [
    ...new Set(entidades.map((entidad) => entidad.nombre_base)),
  ].sort((a, b) => normalizar(b).length - normalizar(a).length);

  for (const nombreBase of nombresBase) {
    const base = normalizar(nombreBase);

    if (!descripcionNormalizada.startsWith(`${base} `)) {
      continue;
    }

    const referencia = descripcionNormalizada.slice(base.length).trim();

    if (!referencia) {
      continue;
    }

    const candidatas = entidades.filter(
      (entidad) => normalizar(entidad.nombre_base) === base,
    );

    const entidadId = await buscarPorReferencia(db, candidatas, referencia);

    if (entidadId) {
      return entidadId;
    }
  }

  return null;
}

export async function resolverEntidad(
  db: D1Database,
  mensajeUsuario: string,
  datos: DatosEntidad,
) {
  if (!datos.entidad) {
    return null;
  }

  const existentes = await buscarEntidadesActivas(
    db,
    datos.tipo,
    datos.entidad,
  );

  if (esEntidadNueva(mensajeUsuario, datos.entidad)) {
    const entidadId = await crearEntidad(db, {
      tipo: datos.tipo,
      nombreBase: datos.entidad,
      etiqueta: null,
    });

    return {
      entidadId,
      esNueva: true,
    };
  }

  if (datos.referencia) {
    const entidadId = await buscarPorReferencia(
      db,
      existentes,
      datos.referencia,
    );

    if (!entidadId) {
      return null;
    }

    return {
      entidadId,
      esNueva: false,
    };
  }

  if (existentes.length === 1) {
    return {
      entidadId: existentes[0].id,
      esNueva: false,
    };
  }

  if (existentes.length > 1) {
    return null;
  }

  const entidadCompuesta = await buscarEntidadCompuesta(
    db,
    datos.tipo,
    datos.entidad,
  );

  if (entidadCompuesta) {
    return {
      entidadId: entidadCompuesta,
      esNueva: false,
    };
  }

  const entidadId = await crearEntidad(db, {
    tipo: datos.tipo,
    nombreBase: datos.entidad,
    etiqueta: null,
  });

  return {
    entidadId,
    esNueva: true,
  };
}
