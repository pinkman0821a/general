import { crearPasswordHash } from '../services/passwordService';
import { obtenerUsuarioSesion } from '../services/sessionService';

type RolUsuario = 'coordinador' | 'tecnico';

type Usuario = {
	id: number;
	nombre: string;
	user: string;
	rol: RolUsuario;
	activo: number;
	created_at: string;
};

type CrearUsuarioBody = {
	nombre?: string;
	user?: string;
	password?: string;
	rol?: string;
};

export async function listarUsuarios(request: Request, env: Env): Promise<Response> {
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
					message: 'No tienes permiso',
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
          rol,
          activo,
          created_at
        FROM usuarios
        ORDER BY nombre ASC
      `,
		).all<Usuario>();

		return Response.json({
			status: 'ok',
			usuarios: resultado.results,
		});
	} catch {
		return Response.json(
			{
				status: 'error',
				message: 'No se pudieron consultar los usuarios',
			},
			{
				status: 500,
			},
		);
	}
}

export async function crearUsuario(request: Request, env: Env): Promise<Response> {
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
					message: 'Solo el coordinador puede crear usuarios',
				},
				{
					status: 403,
				},
			);
		}

		const body = await request.json<CrearUsuarioBody>();

		const nombre = body.nombre?.trim();
		const user = body.user?.trim().toLowerCase();
		const password = body.password;
		const rol = body.rol?.trim();

		if (!nombre || !user || !password || !rol) {
			return Response.json(
				{
					status: 'error',
					message: 'nombre, user, password y rol son obligatorios',
				},
				{
					status: 400,
				},
			);
		}

		if (password.length < 8) {
			return Response.json(
				{
					status: 'error',
					message: 'La contraseña debe tener mínimo 8 caracteres',
				},
				{
					status: 400,
				},
			);
		}

		if (rol !== 'coordinador' && rol !== 'tecnico') {
			return Response.json(
				{
					status: 'error',
					message: 'El rol debe ser coordinador o tecnico',
				},
				{
					status: 400,
				},
			);
		}

		const existente = await env.DB.prepare(
			`
        SELECT id
        FROM usuarios
        WHERE user = ?
        LIMIT 1
      `,
		)
			.bind(user)
			.first();

		if (existente) {
			return Response.json(
				{
					status: 'error',
					message: 'El usuario ya existe',
				},
				{
					status: 409,
				},
			);
		}

		const passwordHash = await crearPasswordHash(password);

		await env.DB.prepare(
			`
        INSERT INTO usuarios (
          nombre,
          user,
          password_hash,
          rol
        )
        VALUES (?, ?, ?, ?)
      `,
		)
			.bind(nombre, user, passwordHash, rol)
			.run();

		const usuario = await env.DB.prepare(
			`
        SELECT
          id,
          nombre,
          user,
          rol,
          activo,
          created_at
        FROM usuarios
        WHERE user = ?
        LIMIT 1
      `,
		)
			.bind(user)
			.first<Usuario>();

		return Response.json(
			{
				status: 'ok',
				usuario,
			},
			{
				status: 201,
			},
		);
	} catch {
		return Response.json(
			{
				status: 'error',
				message: 'No se pudo crear el usuario',
			},
			{
				status: 500,
			},
		);
	}
}
