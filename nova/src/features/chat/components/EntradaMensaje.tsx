import { useState } from "react";
import "../styles/EntradaMensaje.css";

type EntradaMensajeProps = {
  onEnviar?: (texto: string) => void;
  deshabilitado?: boolean;
};

function EntradaMensaje({ onEnviar, deshabilitado = false }: EntradaMensajeProps) {
  const [texto, setTexto] = useState("");

  function manejarEnvio() {
    const textoLimpio = texto.trim();
    if (!textoLimpio || deshabilitado) return;
    onEnviar?.(textoLimpio);
    setTexto("");
  }

  return (
    <div className="entrada-mensaje">
      <textarea
        className="entrada-mensaje__input"
        placeholder="Escríbele a NOVA..."
        value={texto}
        rows={1}
        disabled={deshabilitado}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === "Enter" && !evento.shiftKey) {
            evento.preventDefault();
            manejarEnvio();
          }
        }}
      />
      <button
        className="entrada-mensaje__boton"
        onClick={manejarEnvio}
        disabled={deshabilitado || !texto.trim()}
        aria-label="Enviar mensaje"
      >
        <span>↑</span>
      </button>
    </div>
  );
}

export default EntradaMensaje;
