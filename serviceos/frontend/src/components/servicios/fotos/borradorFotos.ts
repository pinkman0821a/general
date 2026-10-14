import { maximoFotosMensaje, validarFoto, type FotoServicio } from '../../../services/servicioFotosService';

export type FotoNueva = { id: string; archivo: File; url: string };
export function crearBorradorFotos() {
  let nuevas: FotoNueva[] = [], existentes: FotoServicio[] = [], eliminar: number[] = [];
  let lote = crypto.randomUUID();
  const leer = () => ({ nuevas: [...nuevas], existentes: [...existentes], eliminar: [...eliminar] });
  function liberar() { nuevas.forEach(foto => URL.revokeObjectURL(foto.url)); nuevas = []; }
  return {
    leer, liberar,
    cargar(fotos: FotoServicio[]) { existentes = fotos; return leer(); },
    agregar(archivos: File[]) {
      if (existentes.length - eliminar.length + nuevas.length + archivos.length > 5) throw new Error(maximoFotosMensaje);
      archivos.forEach(validarFoto);
      const creadas: FotoNueva[] = [];
      try { for (const archivo of archivos) creadas.push({ archivo, id: crypto.randomUUID(), url: URL.createObjectURL(archivo) }); }
      catch (causa) { creadas.forEach(foto => URL.revokeObjectURL(foto.url)); throw causa; }
      nuevas.push(...creadas); lote = crypto.randomUUID(); return leer();
    },
    quitar(id: string) {
      const foto = nuevas.find(item => item.id === id);
      if (foto) URL.revokeObjectURL(foto.url);
      nuevas = nuevas.filter(item => item.id !== id); lote = crypto.randomUUID(); return leer();
    },
    marcar(id: number) {
      if (!eliminar.includes(id) && !existentes.some(foto => foto.id === id)) return leer();
      if (eliminar.includes(id) && existentes.length - eliminar.length + nuevas.length >= 5) throw new Error(maximoFotosMensaje);
      eliminar = eliminar.includes(id) ? eliminar.filter(foto => foto !== id) : [...eliminar, id];
      lote = crypto.randomUUID(); return leer();
    },
    solicitud() { return { archivos: nuevas.map(foto => foto.archivo), eliminar: [...eliminar], lote }; },
    cambios() { return nuevas.length > 0 || eliminar.length > 0; },
    completado(fotos: FotoServicio[]) { liberar(); existentes = fotos; eliminar = []; return leer(); },
  };
}
