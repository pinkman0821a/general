import ReactMarkdown from "react-markdown";
import type { Mensaje } from "../types/Mensaje";
import "../styles/MensajeChat.css";

function MensajeChat({ mensaje }: { mensaje: Mensaje }) {
  const esNova = mensaje.autor === "nova";

  return (
    <div className={`mensaje-fila ${esNova ? "mensaje-fila--nova" : "mensaje-fila--usuario"}`}>
      {esNova && <div className="mensaje-avatar">N</div>}
      <article className={`mensaje-chat ${esNova ? "mensaje-chat--nova" : "mensaje-chat--usuario"}`}>
        <span className="mensaje-chat__autor">{esNova ? "NOVA" : "Tú"}</span>
        <div className="mensaje-chat__contenido">
          <ReactMarkdown>{mensaje.texto}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}

export default MensajeChat;
