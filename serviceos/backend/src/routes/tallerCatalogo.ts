import { crearAccesorioCatalogo, eliminarAccesorioCatalogo, listarAccesoriosCatalogo } from '../services/tallerCatalogoService';
import { errorRuta, idRuta, leerObjeto, protegerCoordinador } from './rutaComun';

export async function gestionarTallerCatalogo(request: Request, env: Env, valorId?: string) {
  try {
    const rechazo = await protegerCoordinador(request, env, 'Solo el coordinador puede administrar accesorios frecuentes');
    if (rechazo) return rechazo;
    if (request.method === 'GET') {
      const resultado = await listarAccesoriosCatalogo(env);
      return Response.json({ status: 'ok', accesorios: resultado.results });
    }
    if (request.method === 'DELETE' && valorId !== undefined) {
      const id = idRuta(valorId);
      if (id === null) return errorRuta('ID de accesorio inválido', 400);
      const resultado = await eliminarAccesorioCatalogo(env, id);
      if (!resultado.meta.changes) return errorRuta('Accesorio frecuente no encontrado', 404);
      return Response.json({ status: 'ok' });
    }
    const body = await leerObjeto(request);
    const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : '';
    if (!nombre || Object.keys(body ?? {}).some((campo) => campo !== 'nombre')) {
      return errorRuta('Indica únicamente un nombre no vacío para el accesorio', 400);
    }
    const accesorio = await crearAccesorioCatalogo(env, nombre);
    if (!accesorio) return errorRuta('Ese accesorio frecuente ya existe', 409);
    return Response.json({ status: 'ok', accesorio }, { status: 201 });
  } catch {
    return errorRuta('No se pudo gestionar el catálogo de accesorios', 500);
  }
}
