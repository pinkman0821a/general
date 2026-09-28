type EntidadResumen = {
  id: number;
  nombre_base: string;
};

type MemoriaResumen = {
  id: number;
  entidad_id: number;
  clave: string;
  valor: string;
  estado: string;
  reemplaza_id: number | null;
};

function normalizar(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizar(texto: string) {
  if (!texto) {
    return texto;
  }

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function pluralizar(texto: string) {
  if (texto.endsWith("s")) {
    return texto;
  }

  return /[aeiouáéíóú]$/i.test(texto) ? `${texto}s` : `${texto}es`;
}

function numeroTexto(numero: number) {
  const numeros = [
    "cero",
    "una",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
    "diez",
  ];

  return numeros[numero] ?? String(numero);
}

function esConsultaResumen(texto: string) {
  const contenido = ` ${normalizar(texto)} `;

  return (
    contenido.includes(" que recuerdas de ") ||
    contenido.includes(" lo que recuerdas de ") ||
    contenido.includes(" todo lo que recuerdas de ") ||
    contenido.includes(" que sabes de ") ||
    contenido.includes(" lo que sabes de ") ||
    contenido.includes(" todo lo que sabes de ") ||
    contenido.includes(" que conoces de ") ||
    contenido.includes(" informacion tienes de ") ||
    contenido.includes(" datos tienes de ")
  );
}

function contieneEntidad(mensaje: string, entidad: string) {
  const texto = ` ${normalizar(mensaje)} `;

  const nombre = normalizar(entidad);

  const singular = ` ${nombre} `;

  const plural = ` ${normalizar(pluralizar(entidad))} `;

  return texto.includes(singular) || texto.includes(plural);
}

async function obtenerEntidades(db: D1Database) {
  const resultado = await db
    .prepare(
      `
      SELECT id, nombre_base
      FROM entidades
      WHERE estado = 'activa'
      ORDER BY id ASC
    `,
    )
    .all<EntidadResumen>();

  return resultado.results;
}

function seleccionarEntidades(mensaje: string, entidades: EntidadResumen[]) {
  const coincidencias = entidades.filter((entidad) =>
    contieneEntidad(mensaje, entidad.nombre_base),
  );

  if (coincidencias.length === 0) {
    return [];
  }

  const nombres = [
    ...new Set(coincidencias.map((entidad) => normalizar(entidad.nombre_base))),
  ];

  if (nombres.length !== 1) {
    return [];
  }

  return coincidencias;
}

async function obtenerMemorias(db: D1Database, entidades: EntidadResumen[]) {
  const marcadores = entidades.map(() => "?").join(", ");

  const resultado = await db
    .prepare(
      `
      SELECT
        id,
        entidad_id,
        clave,
        valor,
        estado,
        reemplaza_id
      FROM memorias
      WHERE entidad_id IN (${marcadores})
      ORDER BY entidad_id ASC, id ASC
    `,
    )
    .bind(...entidades.map((entidad) => entidad.id))
    .all<MemoriaResumen>();

  return resultado.results;
}

function obtenerCadenaAnterior(
  actual: MemoriaResumen,
  memorias: MemoriaResumen[],
) {
  const porId = new Map(memorias.map((memoria) => [memoria.id, memoria]));

  const anteriores: MemoriaResumen[] = [];

  let anteriorId = actual.reemplaza_id;

  while (anteriorId) {
    const anterior = porId.get(anteriorId);

    if (!anterior) {
      break;
    }

    anteriores.push(anterior);
    anteriorId = anterior.reemplaza_id;
  }

  return anteriores.reverse();
}

function describirClave(
  clave: string,
  actual: MemoriaResumen,
  memorias: MemoriaResumen[],
) {
  const anteriores = obtenerCadenaAnterior(actual, memorias);

  if (anteriores.length === 0) {
    return `${clave}: ${actual.valor}`;
  }

  const valores = anteriores.map((memoria) => memoria.valor).join(" → ");

  if (normalizar(clave) === "color") {
    return `color actual: ${actual.valor}; colores anteriores: ${valores}`;
  }

  return `${clave} actual: ${actual.valor}; valores anteriores: ${valores}`;
}

function describirEntidad(entidadId: number, memorias: MemoriaResumen[]) {
  const propias = memorias.filter(
    (memoria) => memoria.entidad_id === entidadId,
  );

  const activas = propias.filter((memoria) => memoria.estado === "activa");

  if (activas.length === 0) {
    return null;
  }

  return activas
    .map((actual) => describirClave(actual.clave, actual, propias))
    .join("; ");
}

export async function responderResumenEntidad(db: D1Database, mensaje: string) {
  if (!esConsultaResumen(mensaje)) {
    return null;
  }

  const todasEntidades = await obtenerEntidades(db);

  const entidades = seleccionarEntidades(mensaje, todasEntidades);

  if (entidades.length === 0) {
    return null;
  }

  const memorias = await obtenerMemorias(db, entidades);

  const nombre = entidades[0].nombre_base;

  const detalles = entidades
    .map((entidad) => describirEntidad(entidad.id, memorias))
    .filter((detalle): detalle is string => Boolean(detalle));

  if (detalles.length === 0) {
    return null;
  }

  if (detalles.length === 1) {
    return `De tu ${nombre} recuerdo: ${detalles[0]}.`;
  }

  const encabezado = `Recuerdo que tienes ${numeroTexto(
    detalles.length,
  )} ${pluralizar(nombre)}:`;

  const filas = detalles.map(
    (detalle) => `- ${capitalizar(nombre)}: ${detalle}.`,
  );

  return [encabezado, ...filas].join("\n");
}
