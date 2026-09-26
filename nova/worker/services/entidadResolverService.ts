import { buscarEntidadesActivas, crearEntidad } from "./entidadService.js";
import { obtenerMemoriasPorEntidadId } from "./memoriaService.js";

type DatosEntidad = {
  tipo: string;
  entidad: string | null;
  referencia?: string | null;
  clave: string;
  valor: string;
};

const INDICADORES_ENTIDAD_NUEVA = [
  "otra ",
  "otro ",
  "segunda ",
  "segundo ",
  "tercera ",
  "tercer ",
  "nueva ",
  "nuevo ",
  "una mas",
  "uno mas",
];

function normalizar(texto: string | null | undefined) {
  return (texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esEntidadNueva(mensaje: string) {
  const texto = normalizar(mensaje);

  return INDICADORES_ENTIDAD_NUEVA.some((indicador) =>
    texto.includes(indicador),
  );
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

  if (esEntidadNueva(mensajeUsuario)) {
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

  if (existentes.length === 0) {
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

  return null;
}
