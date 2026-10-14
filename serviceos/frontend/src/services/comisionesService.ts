async function comprobarRespuesta(respuesta: Response) {
  if (respuesta.ok) return;
  const datos = await respuesta.json().catch(() => null) as { message?: string } | null;
  throw new Error(respuesta.status === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
    : datos?.message ?? 'No se pudieron obtener las comisiones.');
}

export async function descargarComisiones(mes: string) {
  const respuesta = await fetch(`/api/servicios/comisiones.xlsx?${new URLSearchParams({ mes })}`, { credentials: 'include' });
  await comprobarRespuesta(respuesta);
  const blob = await respuesta.blob();
  const disposicion = respuesta.headers.get('Content-Disposition') ?? '';
  const extendido = disposicion.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const nombre = extendido ? decodeURIComponent(extendido) : disposicion.match(/filename="([^"]+)"/i)?.[1]
    ?? disposicion.match(/filename=([^;]+)/i)?.[1]?.trim() ?? `comisiones-${mes}.xlsx`;
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  try {
    enlace.href = url;
    enlace.download = nombre.replace(/[/\\]/g, '-');
    document.body.appendChild(enlace);
    enlace.click();
  } finally {
    enlace.remove();
    URL.revokeObjectURL(url);
  }
}

export async function obtenerPagoTecnicos(mes: string, signal?: AbortSignal) {
  const respuesta = await fetch(`/api/servicios/resumen-pagos?${new URLSearchParams({ mes })}`, { credentials: 'include', signal });
  await comprobarRespuesta(respuesta);
  const datos = await respuesta.json() as { pago_tecnicos: number };
  return datos.pago_tecnicos;
}
