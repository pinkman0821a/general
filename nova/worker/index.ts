import {
  procesarChat,
  procesarChatStream,
  type DatosChat,
} from "./services/chatFlowService.js";
import { consultarEcho } from "./services/echoService.js";
import {
  buscarMemoriasPorEcho,
  buscarMemoriasRelevantes,
} from "./services/memoriaBusquedaService.js";
import { extraerMemorias } from "./services/memoriaExtractor.js";
import {
  guardarMemoria,
  obtenerMemoriasActivas,
  type NuevaMemoria,
} from "./services/memoriaService.js";
import { obtenerUsoIAHoy } from "./services/usoIaService.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat-stream" && request.method === "POST") {
      const datos = await request.json<DatosChat>();

      const stream = await procesarChatStream(env.AI, env.nova_db, datos);

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      const datos = await request.json<DatosChat>();

      const mensaje = await procesarChat(env.AI, env.nova_db, datos);

      return Response.json({
        mensaje,
      });
    }

    if (url.pathname === "/api/chat" && request.method === "GET") {
      return Response.json({
        mensaje: "Servidor de NOVA funcionando",
      });
    }

    if (url.pathname === "/api/uso-ia" && request.method === "GET") {
      return Response.json(await obtenerUsoIAHoy(env.nova_db));
    }

    if (url.pathname === "/api/memorias" && request.method === "POST") {
      const memoria = await request.json<NuevaMemoria>();

      return Response.json({
        ok: true,
        resultado: await guardarMemoria(env.nova_db, memoria),
      });
    }

    if (url.pathname === "/api/memorias" && request.method === "GET") {
      return Response.json({
        memorias: await obtenerMemoriasActivas(env.nova_db),
      });
    }

    if (url.pathname === "/api/memoria-extraer" && request.method === "POST") {
      const datos = await request.json<{
        mensaje: string;
      }>();

      return Response.json({
        memorias: await extraerMemorias(env.AI, datos.mensaje, env.nova_db),
      });
    }

    if (url.pathname === "/api/memoria-buscar" && request.method === "POST") {
      const datos = await request.json<{
        pregunta: string;
      }>();

      return Response.json({
        memorias: await buscarMemoriasRelevantes(env.nova_db, datos.pregunta),
      });
    }

    if (url.pathname === "/api/echo" && request.method === "POST") {
      const datos = await request.json<{
        pregunta: string;
      }>();

      const consulta = await consultarEcho(env.AI, datos.pregunta, env.nova_db);

      return Response.json({
        consulta,
        memorias: await buscarMemoriasPorEcho(env.nova_db, consulta),
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          error: "Ruta no encontrada",
        },
        {
          status: 404,
        },
      );
    }

    return new Response(null, {
      status: 404,
    });
  },
} satisfies ExportedHandler<Env>;
