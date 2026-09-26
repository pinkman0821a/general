import { useState } from "react";
import type { Mensaje } from "../types/Mensaje";
import ListaMensajes from "./ListaMensajes";
import EntradaMensaje from "./EntradaMensaje";
import UsoIa from "./UsoIa";
import { enviarMensajeAlServidorStream } from "../services/chatService";
import { limpiarRespuestaNova } from "../services/limpiarRespuestaNova";
import "../styles/Chat.css";

function Chat() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: 1,
      autor: "nova",
      texto: "Hola, soy NOVA. ¿En qué puedo ayudarte?",
    },
  ]);
  const [novaPensando, setNovaPensando] = useState(false);
  const [actualizacionUso, setActualizacionUso] = useState(0);

  async function enviarMensaje(texto: string) {
    if (novaPensando) return;

    const nuevoMensaje: Mensaje = {
      id: Date.now(),
      autor: "usuario",
      texto,
    };

    const mensajesConUsuario = [...mensajes, nuevoMensaje];
    const idRespuestaNova = Date.now() + 1;

    setMensajes(mensajesConUsuario);
    setNovaPensando(true);

    try {
      await enviarMensajeAlServidorStream(mensajesConUsuario, (fragmento) => {
        setNovaPensando(false);

        setMensajes((mensajesActuales) => {
          const respuestaExiste = mensajesActuales.some(
            (mensaje) => mensaje.id === idRespuestaNova,
          );

          if (!respuestaExiste) {
            return [
              ...mensajesActuales,
              {
                id: idRespuestaNova,
                autor: "nova",
                texto: limpiarRespuestaNova(fragmento),
              },
            ];
          }

          return mensajesActuales.map((mensaje) =>
            mensaje.id === idRespuestaNova
              ? {
                  ...mensaje,
                  texto: limpiarRespuestaNova(mensaje.texto + fragmento),
                }
              : mensaje,
          );
        });
      });
    } catch (error) {
      console.error("[NOVA] Error al responder:", error);
      setMensajes((mensajesActuales) => [
        ...mensajesActuales,
        {
          id: Date.now(),
          autor: "nova",
          texto: "Tuve un problema al responder. Inténtalo otra vez.",
        },
      ]);
    } finally {
      setNovaPensando(false);
      setActualizacionUso((valor) => valor + 1);
    }
  }

  return (
    <section className="chat">
      <div className="chat__topbar">
        <div>
          <span className="chat__eyebrow">CONVERSACIÓN</span>
          <h2>Chat con NOVA</h2>
        </div>
        <UsoIa actualizacion={actualizacionUso} />
      </div>

      <div className="chat__conversation">
        <ListaMensajes mensajes={mensajes} />

        {novaPensando && (
          <div className="chat__thinking" aria-label="NOVA está pensando">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <EntradaMensaje onEnviar={enviarMensaje} deshabilitado={novaPensando} />
    </section>
  );
}

export default Chat;
