import { crearPasswordHash } from '../services/passwordService';
import { obtenerUsuarioSesion } from '../services/sessionService';

type CrearUsuarioBody = {
	nombre?: string;
	user?: string;
	password?: string;
};

type UsuarioDb = {
	id: number;
	nombre: string;
	user: string;
	rol: 'coordinador' | 'tecnico';
	activo: number;
	created_at: string;
};

export async function listarUsuarios(request: Request, env: Env): Promise<Response> {
	try {
		const sesion = await obtenerUsuarioSesion(request, env);

		if (!sesion) {
			return noAutenticado();
		}

		if (sesion.rol !== 'coordinador') {
			return sinPermiso();
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
        ORDER BY
          CASE
            WHEN rol = 'coordinador' THEN 0
            ELSE 1
          END,
          nombre ASC
      `,
		).all<UsuarioDb>();

		return Response.json({
			status: 'ok',
			usuarios: resultado.results,
		});
	} catch {
		return Response.json(
			{
				status: 'error',
				message: 'No se pudieron cargar los usuarios',
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
			return noAutenticado();
		}

		if (sesion.rol !== 'coordinador') {
			return sinPermiso();
		}

		const body = await request.json<CrearUsuarioBody>();

		const nombre = body.nombre?.trim();
		const user = body.user?.trim().toLowerCase();
		const password = body.password;

		if (!nombre || !user || !password) {
			return Response.json(
				{
					status: 'error',
					message: 'Debes completar todos los campos',
				},
				{
					status: 400,
				},
			);
		}

		if (nombre.length > 80) {
			return Response.json(
				{
					status: 'error',
					message: 'El nombre es demasiado largo',
				},
				{
					status: 400,
				},
			);
		}

		if (user.length < 3 || user.length > 40) {
			return Response.json(
				{
					status: 'error',
					message: 'El usuario debe tener entre 3 y 40 caracteres',
				},
				{
					status: 400,
				},
			);
		}

		if (!/^[a-z0-9._-]+$/.test(user)) {
			return Response.json(
				{
					status: 'error',
					message: 'El usuario contiene caracteres no permitidos',
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

		const existente = await env.DB.prepare(
			`
        SELECT id
        FROM usuarios
        WHERE user = ?
        LIMIT 1
      `,
		)
			.bind(user)
			.first<{ id: number }>();

		if (existente) {
			return Response.json(
				{
					status: 'error',
					message: 'Ese usuario ya existe',
				},
				{
					status: 409,
				},
			);
		}

		const passwordGuardado = await crearPasswordHash(password);

		await env.DB.prepare(
			`
        INSERT INTO usuarios (
          nombre,
          user,
          rol,
          activo,
          password_hash
        )
        VALUES (?, ?, 'tecnico', 1, ?)
      `,
		)
			.bind(nombre, user, passwordGuardado)
			.run();

		const usuarioCreado = await env.DB.prepare(
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
			.first<UsuarioDb>();

		return Response.json(
			{
				status: 'ok',
				usuario: usuarioCreado,
			},
			{
				status: 201,
			},
		);
	} catch {
		return Response.json(
			{
				status: 'error',
				message: 'No se pudo crear el técnico',
			},
			{
				status: 500,
			},
		);
	}
}

function noAutenticado(): Response {
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

function sinPermiso(): Response {
	return Response.json(
		{
			status: 'error',
			message: 'Solo el coordinador puede administrar usuarios',
		},
		{
			status: 403,
		},
	);
}
