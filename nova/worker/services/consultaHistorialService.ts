import {
  agruparHistoriales,
  normalizar,
  obtenerReferenciaAntesDe,
  obtenerRegistrosColor,
  seleccionarPorColorActual,
  seleccionarPorHistorial,
  type HistorialEntidad,
} from "./consultaHistorialDatosService.js";

const ALIAS: Record<string, string> = {
  bici: "bicicleta",
  bicis: "bicicleta",
  bicicleta: "bicicleta",
  bicicletas: "bicicleta",
  carro: "carro",
  carros: "carro",
  moto: "moto",
  motos: "moto",
  mascota: "mascota",
  mascotas: "mascota",
};

const NUMEROS = [
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

function pluralizar(nombre: string) {
  if (nombre.endsWith("s")) {
    return nombre;
  }

  return /[aeiou]$/.test(nombre) ? `${nombre}s` : `${nombre}es`;
}

function numeroTexto(numero: number) {
  return NUMEROS[numero] ?? String(numero);
}

function obtenerEntidad(texto: string) {
  for (const palabra of normalizar(texto).split(" ")) {
    if (ALIAS[palabra]) {
      return ALIAS[palabra];
    }
  }

  return null;
}

function esConsultaHistorial(texto: string) {
  const normalizado = normalizar(texto);

  if (normalizado.includes("historial") || normalizado.includes("antes de ")) {
    return true;
  }

  const hablaDeColor =
    normalizado.includes("color") || normalizado.includes("colores");

  const hablaDelPasado =
    normalizado.includes("antes") ||
    normalizado.includes("anterior") ||
    normalizado.includes("anteriores") ||
    normalizado.includes("ha tenido") ||
    normalizado.includes("han tenido") ||
    normalizado.includes("era ");

  return hablaDeColor && hablaDelPasado;
}

function quiereHistorialCompleto(texto: string) {
  const normalizado = normalizar(texto);

  return (
    normalizado.includes("historial") ||
    normalizado.includes("ha tenido") ||
    normalizado.includes("han tenido") ||
    normalizado.includes("colores tuvo") ||
    normalizado.includes("colores tenia")
  );
}

function describirAmbiguedad(entidad: string, historiales: HistorialEntidad[]) {
  if (historiales.length === 2) {
    return `Tengo historial de dos ${pluralizar(entidad)}: una actualmente ${historiales[0].actual.valor} y otra ${historiales[1].actual.valor}. ¿A cuál te refieres?`;
  }

  const colores = historiales
    .map((historial) => historial.actual.valor)
    .join(", ");

  return `Tengo historial de ${numeroTexto(historiales.length)} ${pluralizar(entidad)}. Sus colores actuales son ${colores}. ¿A cuál te refieres?`;
}

function responderHistorialCompleto(
  entidad: string,
  historial: HistorialEntidad,
) {
  const colores = historial.memorias.map((memoria) => memoria.valor);

  if (colores.length === 1) {
    return `Solo tengo registrado el color ${colores[0]} para tu ${entidad}.`;
  }

  return `Tu ${entidad} que actualmente es ${historial.actual.valor} ha pasado por estos colores: ${colores.join(" → ")}.`;
}

function responderAntesDeReferencia(
  entidad: string,
  historial: HistorialEntidad,
  referencia: string,
) {
  const memoriaObjetivo = [...historial.memorias]
    .reverse()
    .find((memoria) => normalizar(memoria.valor) === normalizar(referencia));

  if (!memoriaObjetivo) {
    return null;
  }

  if (!memoriaObjetivo.reemplaza_id) {
    return `No tengo un color anterior registrado antes de ${memoriaObjetivo.valor} para tu ${entidad}.`;
  }

  const anterior = historial.memorias.find(
    (memoria) => memoria.id === memoriaObjetivo.reemplaza_id,
  );

  if (!anterior) {
    return null;
  }

  return `Antes de ser ${memoriaObjetivo.valor}, tu ${entidad} era ${anterior.valor}.`;
}

function responderAnteriorActual(entidad: string, historial: HistorialEntidad) {
  if (!historial.actual.reemplaza_id) {
    return `No tengo un color anterior registrado para tu ${entidad} que actualmente es ${historial.actual.valor}.`;
  }

  const anterior = historial.memorias.find(
    (memoria) => memoria.id === historial.actual.reemplaza_id,
  );

  if (!anterior) {
    return null;
  }

  return `Antes de ser ${historial.actual.valor}, tu ${entidad} era ${anterior.valor}.`;
}

export async function responderConsultaHistorial(
  db: D1Database,
  mensaje: string,
) {
  if (!esConsultaHistorial(mensaje)) {
    return null;
  }

  const entidad = obtenerEntidad(mensaje);

  if (!entidad) {
    return null;
  }

  const registros = await obtenerRegistrosColor(db, entidad);

  const historiales = agruparHistoriales(registros);

  if (historiales.length === 0) {
    return null;
  }

  const referenciaAntes = obtenerReferenciaAntesDe(mensaje, historiales);

  let seleccionada = seleccionarPorColorActual(mensaje, historiales);

  if (!seleccionada && referenciaAntes) {
    seleccionada = seleccionarPorHistorial(referenciaAntes, historiales);
  }

  if (!seleccionada && historiales.length === 1) {
    seleccionada = historiales[0];
  }

  if (!seleccionada) {
    return describirAmbiguedad(entidad, historiales);
  }

  if (referenciaAntes) {
    return responderAntesDeReferencia(entidad, seleccionada, referenciaAntes);
  }

  if (quiereHistorialCompleto(mensaje)) {
    return responderHistorialCompleto(entidad, seleccionada);
  }

  return responderAnteriorActual(entidad, seleccionada);
}
