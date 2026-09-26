import { useEffect, useRef } from "react";
import type { Mensaje } from "../types/Mensaje";
import MensajeChat from "./MensajeChat";

function ListaMensajes({ mensajes }: { mensajes: Mensaje[] }) {
  const finalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes]);

  return (
    <div className="chat__messages">
      {mensajes.map((mensaje) => (
        <MensajeChat key={mensaje.id} mensaje={mensaje} />
      ))}
      <div ref={finalRef} />
    </div>
  );
}

export default ListaMensajes;
