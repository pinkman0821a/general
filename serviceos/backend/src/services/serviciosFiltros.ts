import { idRuta } from '../routes/rutaComun';
import type { UsuarioSesion } from './sessionService';
import { ErrorServicio, estadosServicio, tiposServicio } from './serviciosValidacion';

export function filtrosServicios(parametros: URLSearchParams, usuario: UsuarioSesion) {
	const condiciones: string[] = [];
	const valores: (string | number)[] = [];
	const permitidos = ['mes', 'estado', 'tipo', 'tecnico_id', 'buscar'];
	for (const clave of parametros.keys()) {
		if (!permitidos.includes(clave) || parametros.getAll(clave).length !== 1) throw new ErrorServicio('Filtros inválidos');
	}
	if (usuario.rol === 'tecnico') {
		if (parametros.has('tecnico_id')) throw new ErrorServicio('Filtro de técnico reservado al coordinador', 403);
		condiciones.push('tecnico_id = ?'); valores.push(usuario.id);
	}
	const mes = parametros.get('mes');
	if (mes !== null) {
		if (!/^(?!0000)[0-9]{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new ErrorServicio('Mes inválido');
		condiciones.push('fecha_programada BETWEEN ? AND ?'); valores.push(`${mes}-01`, `${mes}-31`);
	}
	for (const [campo, opciones] of [['estado', estadosServicio], ['tipo', tiposServicio]] as const) {
		const valor = parametros.get(campo);
		if (valor !== null) {
			if (!(opciones as readonly string[]).includes(valor)) throw new ErrorServicio(`${campo} inválido`);
			condiciones.push(`${campo} = ?`); valores.push(valor);
		}
	}
	if (parametros.has('tecnico_id')) {
		const id = idRuta(parametros.get('tecnico_id')!);
		if (id === null) throw new ErrorServicio('Filtro de técnico inválido');
		condiciones.push('tecnico_id = ?'); valores.push(id);
	}
	const buscar = parametros.get('buscar');
	if (buscar !== null) {
		if (!buscar.trim()) throw new ErrorServicio('Búsqueda vacía');
		const campos = ['cliente_nombre', 'cliente_telefono', 'ciudad', 'maquina', 'tipo_falla'];
		condiciones.push(`(${campos.map((campo) => `instr(lower(coalesce(${campo}, '')), lower(?)) > 0`).join(' OR ')})`);
		valores.push(...campos.map(() => buscar.trim()));
	}
	return { where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', valores };
}
