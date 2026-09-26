// ======================================================
// NOVA - TIPO MENSAJE
// ======================================================

// Este tipo define la estructura que debe tener
// cada mensaje dentro de una conversación.
// ======================================================

export type Mensaje = {
  id: number
  autor: 'usuario' | 'nova'
  texto: string
}