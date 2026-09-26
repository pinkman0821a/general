import { registrarUsoIA } from "./usoIaService.js";

export type MemoriaExtraida = {
  tipo: string;
  entidad: string | null;
  referencia: string | null;
  clave: string;
  valor: string;
  confianza: number;
  importancia: number;
};

type MemoriaCandidata = MemoriaExtraida & {
  evidencia: string;
};

type RespuestaExtractor = {
  memorias: MemoriaCandidata[];
};

const MODELO_EXTRACTOR = "@cf/meta/llama-3.1-8b-instruct-fp8";

function normalizar(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export async function extraerMemorias(
  ai: Ai,
  mensajeUsuario: string,
  db?: D1Database,
) {
  const respuesta = await ai.run(MODELO_EXTRACTOR, {
    messages: [
      {
        role: "system",
        content: `
Eres el extractor de memoria de NOVA.

Extraes únicamente recuerdos personales útiles y relativamente estables que Juan AFIRMA explícitamente.

Nunca deduzcas información.
Nunca adivines.
Nunca completes datos faltantes.
Nunca conviertas una pregunta en un recuerdo.

No guardes como recuerdo estable planes temporales, viajes del día, retrasos, incidentes puntuales, ubicación momentánea, clientes de una sola visita ni trabajos específicos de una sola ocasión, salvo que Juan diga explícitamente que quiere recordarlos o que describan una situación habitual.

Devuelve exclusivamente JSON válido con esta forma:

{
  "memorias": [
    {
      "tipo": "objeto",
      "entidad": "bicicleta",
      "referencia": null,
      "clave": "color",
      "valor": "roja",
      "confianza": 1,
      "importancia": 6,
      "evidencia": "mi bicicleta es roja"
    }
  ]
}

"entidad" es el nombre base de la persona, objeto, mascota, proyecto o concepto. No metas características descriptivas en la entidad.

Correcto: "bicicleta", "carro", "mamá", "Juan", "NOVA".
Incorrecto: "bicicleta azul", "carro rojo", "mamá Patricia".

"referencia" se usa solamente para identificar una entidad existente cuando Juan la señala por una característica anterior.

"La bicicleta azul ahora es verde" debe extraer entidad "bicicleta", referencia "azul", clave "color", valor "verde".

"Tengo otra bicicleta azul" debe extraer entidad "bicicleta", referencia null, clave "color", valor "azul".

"Mi bicicleta es roja" debe extraer entidad "bicicleta", referencia null, clave "color", valor "roja".

"Mi mamá se llama Patricia" debe extraer tipo "persona", entidad "mamá", clave "nombre", valor "Patricia".

"Uso VS Code para programar NOVA" debe extraer tipo "proyecto", entidad "NOVA", clave "editor", valor "VS Code".

"Me llamo Juan y soy tu creador" debe extraer dos memorias: tipo "persona", entidad "Juan", clave "nombre", valor "Juan"; y tipo "proyecto", entidad "NOVA", clave "creador", valor "Juan".

"Soy técnico de máquinas de impresión" debe extraer tipo "persona", entidad "Juan", clave "ocupacion", valor "técnico de máquinas de impresión".

"Hoy voy para Valledupar, pero el vuelo se retrasó" debe devolver {"memorias":[]}.

"Voy a instalar una DTF de 60 cm a un cliente" debe devolver {"memorias":[]} porque describe un trabajo puntual.

"¿De qué color era antes mi bicicleta?" debe devolver {"memorias":[]}.

Cada memoria debe incluir "evidencia". La evidencia debe ser una parte literal del mensaje de Juan. El valor debe aparecer literalmente dentro de la evidencia. Si hay una referencia, también debe aparecer literalmente dentro de la evidencia.

Si no existe un dato explícitamente afirmado y estable, devuelve:

{
  "memorias": []
}
`.trim(),
      },
      {
        role: "user",
        content: mensajeUsuario,
      },
    ],
  });

  if (db && respuesta.usage) {
    await registrarUsoIA(db, respuesta.usage);
  }

  const texto = respuesta.response;

  if (typeof texto !== "string") {
    return [];
  }

  try {
    const limpio = texto
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const datos = JSON.parse(limpio) as RespuestaExtractor;

    if (!Array.isArray(datos.memorias)) {
      return [];
    }

    const mensajeNormalizado = normalizar(mensajeUsuario);

    return datos.memorias
      .filter((memoria) => {
        if (
          typeof memoria.tipo !== "string" ||
          typeof memoria.clave !== "string" ||
          typeof memoria.valor !== "string" ||
          typeof memoria.evidencia !== "string"
        ) {
          return false;
        }

        const evidencia = normalizar(memoria.evidencia);

        const valor = normalizar(memoria.valor);

        const referencia =
          typeof memoria.referencia === "string"
            ? normalizar(memoria.referencia)
            : "";

        if (
          !evidencia ||
          !valor ||
          !mensajeNormalizado.includes(evidencia) ||
          !evidencia.includes(valor)
        ) {
          return false;
        }

        if (referencia && !evidencia.includes(referencia)) {
          return false;
        }

        return true;
      })
      .map((memoria) => ({
        tipo: memoria.tipo.trim(),
        entidad:
          typeof memoria.entidad === "string" ? memoria.entidad.trim() : null,
        referencia:
          typeof memoria.referencia === "string"
            ? memoria.referencia.trim()
            : null,
        clave: memoria.clave.trim(),
        valor: memoria.valor.trim(),
        confianza: Math.max(0, Math.min(1, Number(memoria.confianza) || 0)),
        importancia: Math.max(
          1,
          Math.min(10, Number(memoria.importancia) || 5),
        ),
      }));
  } catch {
    return [];
  }
}
