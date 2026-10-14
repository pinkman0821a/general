import { obtenerUsuarioSesion } from '../services/sessionService';
import { consultarComisiones, consultarPagoMes, mesComisiones } from '../services/comisionesConsulta';
import { generarComisiones } from '../services/comisionesWorkbook';
import { ErrorServicio } from '../services/serviciosValidacion';
import { errorRuta } from './rutaComun';

export async function gestionarComisiones(request: Request, env: Env, resumen = false) {
	try {
		const usuario = await obtenerUsuarioSesion(request, env);
		if (!usuario) return errorRuta('No autenticado', 401);
		if (resumen && usuario.rol !== 'coordinador') return errorRuta('Resumen reservado al coordinador', 403);
		const parametros = new URL(request.url).searchParams;
		const mes = mesComisiones(parametros);
		if (usuario.rol === 'tecnico' && parametros.has('tecnico_id')) return errorRuta('Identidad definida por la sesión', 403);
		if (resumen) return Response.json({ status: 'ok', mes, pago_tecnicos: await consultarPagoMes(env, mes) });
		const servicios = await consultarComisiones(env, mes, usuario);
		if (!servicios.length) return Response.json({ status: 'error', codigo: 'sin_servicios_realizados',
			message: 'No hay servicios realizados que generen comisión en este mes.' }, { status: 400 });
		const slug = usuario.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
			.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tecnico';
		const nombre = `comisiones-${usuario.rol === 'tecnico' ? slug : 'tecnicos'}-${mes}.xlsx`;
		return new Response(await generarComisiones(servicios, mes), { headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${nombre}"`, 'Cache-Control': 'no-store',
		} });
	} catch (error) {
		if (error instanceof ErrorServicio) return errorRuta(error.message, error.status);
		return errorRuta('No se pudieron generar las comisiones', 500);
	}
}
