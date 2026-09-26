import { registrarUsoIA } from "./usoIaService.js";

export type ConsultaEcho = {
  tipo: string | null;
  entidad: string | null;
  clave: string | null;
  incluirHistorial: boolean;
};

const MODELO_ECHO = "@cf/meta/llama-3.1-8b-instruct-fp8";

function consultaVacia(): ConsultaEcho {
  return {
    tipo: null,
    entidad: null,
    clave: null,
    incluirHistorial: false,
  };
}

export async function consultarEcho(
  ai: Ai,
  pregunta: string,
  db?: D1Database,
): Promise<ConsultaEcho> {
  const respuesta = await ai.run(MODELO_ECHO, {
    messages: [
      {
        role: "system",
        content: `
Eres ECHO, el módulo interno de memoria de NOVA.

Tu única función es interpretar qué recuerdo necesita buscar NOVA.

No respondas la pregunta del usuario.
No inventes el valor del recuerdo.
No mantengas conversación.
No agregues explicaciones.

Devuelve exclusivamente JSON válido.

Formato:
{
  "tipo": null,
  "entidad": null,
  "clave": null,
  "incluirHistorial": false
}

Ejemplos:

Pregunta:
"¿Qué programa suelo utilizar para escribir código?"

Respuesta:
{
  "tipo": "proyecto",
  "entidad": null,
  "clave": "editor",
  "incluirHistorial": false
}

Pregunta:
"¿Cómo se llama mi mamá?"

Respuesta:
{
  "tipo": "persona",
  "entidad": "mamá",
  "clave": "nombre",
  "incluirHistorial": false
}

Pregunta:
"¿De qué color era antes mi bicicleta?"

Respuesta:
{
  "tipo": "objeto",
  "entidad": "bicicleta",
  "clave": "color",
  "incluirHistorial": true
}

Pregunta:
"¿Qué editor uso para NOVA?"

Respuesta:
{
  "tipo": "proyecto",
  "entidad": "NOVA",
  "clave": "editor",
  "incluirHistorial": false
}

Pregunta:
"¿Cómo me llamo?"

Respuesta:
{
  "tipo": "persona",
  "entidad": "Juan",
  "clave": "nombre",
  "incluirHistorial": false
}

Pregunta:
"¿A qué me dedico?"

Respuesta:
{
  "tipo": "persona",
  "entidad": "Juan",
  "clave": "ocupacion",
  "incluirHistorial": false
}

Pregunta:
"¿Quién es tu creador?"

Respuesta:
{
  "tipo": "proyecto",
  "entidad": "NOVA",
  "clave": "creador",
  "incluirHistorial": false
}
`.trim(),
      },
      {
        role: "user",
        content: pregunta,
      },
    ],
  });

  if (db && respuesta.usage) {
    await registrarUsoIA(db, respuesta.usage);
  }

  if (typeof respuesta.response !== "string") {
    return consultaVacia();
  }

  try {
    const texto = respuesta.response
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const datos = JSON.parse(texto);

    return {
      tipo: typeof datos.tipo === "string" ? datos.tipo.trim() : null,
      entidad: typeof datos.entidad === "string" ? datos.entidad.trim() : null,
      clave: typeof datos.clave === "string" ? datos.clave.trim() : null,
      incluirHistorial: datos.incluirHistorial === true,
    };
  } catch {
    return consultaVacia();
  }
}
