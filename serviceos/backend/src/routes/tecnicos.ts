import { obtenerUsuarioSesion } from '../services/sessionService';

type TecnicoDb = {
	id: number;
	nombre: string;
	user: string;
	activo: number;
	created_at: string;
};

export async function listarTecnicos(request: Request, env: Env): Promise<Response> {
	try {
		const sesion = await obtenerUsuarioSesion(request, env);

		if (!sesion) {
			return Response.json(
				{
					status: 'error',
					message: 'No autenticado',
				},
				{
					status: 401,
				},
			);
		}

		if (sesion.rol !== 'coordinador') {
			return Response.json(
				{
					status: 'error',
					message: 'Solo el coordinador puede consultar técnicos',
				},
				{
					status: 403,
				},
			);
		}

		const resultado = await env.DB.prepare(
			`
        SELECT
          id,
          nombre,
          user,
          activo,
          created_at
        FROM usuarios
        WHERE rol = 'tecnico'
        ORDER BY
          activo DESC,
          nombre ASC
      `,
		).all<TecnicoDb>();

		return Response.json({
			status: 'ok',
			tecnicos: resultado.results,
		});
	} catch {
		return Response.json(
			{
				status: 'error',
				message: 'No se pudieron cargar los técnicos',
			},
			{
				status: 500,
			},
		);
	}
}
