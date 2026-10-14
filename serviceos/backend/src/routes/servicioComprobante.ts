import { eliminarComprobante, servicioConComprobante, subirComprobante, verComprobante } from '../services/comprobanteService';
import { ErrorServicio } from '../services/serviciosValidacion';
import { errorRuta, idRuta, protegerCoordinador } from './rutaComun';

export async function gestionarServicioComprobante(request: Request, env: Env, valorId: string) {
	try {
		// Autoriza antes de consultar el servicio, la referencia o de leer el multipart.
		const rechazo = await protegerCoordinador(request, env, 'Solo el coordinador puede gestionar comprobantes de pago');
		if (rechazo) return rechazo;
		const id = idRuta(valorId);
		if (id === null) return errorRuta('ID de servicio inválido', 400);
		const servicio = await servicioConComprobante(env, id);
		if (request.method === 'GET') return await verComprobante(env, servicio);
		const datos = request.method === 'PUT' ? await subirComprobante(request, env, servicio) : await eliminarComprobante(env, servicio);
		return Response.json(datos, { headers: { 'Cache-Control': 'private, no-store' } });
	} catch (causa) {
		if (causa instanceof ErrorServicio) return errorRuta(causa.message, causa.status);
		return errorRuta('No se pudo gestionar el comprobante de pago. Intenta de nuevo.', 500);
	}
}
