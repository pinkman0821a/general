export function mostrarFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function fechaHoy() {
  const hoy = new Date();
  return [hoy.getFullYear(), String(hoy.getMonth() + 1).padStart(2, '0'),
    String(hoy.getDate()).padStart(2, '0')].join('-');
}

export function mensajeError(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación';
}

export function normalizarAccesorio(nombre: string) {
  return nombre.trim().toLocaleLowerCase('es');
}
