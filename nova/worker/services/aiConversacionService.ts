export function pareceConversacionCasual(texto: string) {
  if (!texto.trim() || texto.includes("?") || texto.includes("¿")) {
    return false;
  }

  const normalizado = texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const parecePeticion =
    /^(?:explicame|ayudame|dime|indica|ensename|revisa|como|que|cual|quien|donde|cuando|por que|para que|puedes|podrias|necesito|quiero saber|me puedes)\b/.test(
      normalizado,
    );

  return (
    !parecePeticion &&
    !/\b(?:ayuda|explicacion|informacion)\b/.test(normalizado)
  );
}

export function limpiarRespuestaConversacionCasual(texto: string) {
  const oraciones: string[] = [];
  let inicio = 0;

  for (let indice = 0; indice < texto.length; indice += 1) {
    if (texto[indice] === "\n") {
      while (texto[indice + 1] === "\n") {
        indice += 1;
      }

      oraciones.push(texto.slice(inicio, indice + 1));
      inicio = indice + 1;
      continue;
    }

    if (!".!?".includes(texto[indice])) {
      continue;
    }

    let fin = indice + 1;

    while (fin < texto.length && "\"'”’»)]}*_".includes(texto[fin])) {
      fin += 1;
    }

    if (fin === texto.length || /\s/.test(texto[fin])) {
      oraciones.push(texto.slice(inicio, fin));
      inicio = fin;
      indice = fin - 1;
    }
  }

  if (inicio < texto.length) {
    oraciones.push(texto.slice(inicio));
  }

  const oracionesConservadas = oraciones.filter((oracion) => {
    if (oracion.includes("¿")) {
      return false;
    }

    let finalSinCierres = oracion.trimEnd();

    while (
      finalSinCierres.length > 0 &&
      "\"'”’»)]}*_".includes(finalSinCierres.at(-1)!)
    ) {
      finalSinCierres = finalSinCierres.slice(0, -1);
    }

    if (finalSinCierres.endsWith("?")) {
      return false;
    }

    const inicioNormalizado = oracion
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^(?:(?:[-*+]\s+|>\s*)+|[\s>*_`"'“¿¡(]+)/, "");

    return !/^(?:quieres\b|te gustaria\b|prefieres\b|puedes decirme\b|podrias decirme\b|como te\b|que tal\b|que piensas\b|que opinas\b)/.test(
      inicioNormalizado,
    );
  });

  const respuesta = oracionesConservadas.join("").trim();

  return respuesta || "Te sigo, Juan.";
}
