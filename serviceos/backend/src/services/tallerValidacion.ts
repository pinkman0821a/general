import { fechaValida } from '../utils/fecha';
import { idValido } from '../routes/rutaComun';

export const camposRequeridos = ['cliente_nombre', 'cliente_telefono', 'maquina_tipo', 'falla_reportada'] as const;
export const camposOpcionales = [
	'cliente_contacto', 'maquina_tamano', 'maquina_marca', 'maquina_modelo', 'maquina_serial', 'observaciones',
] as const;
export const camposRecepcion = ['fecha_ingreso', ...camposRequeridos, ...camposOpcionales] as const;
export type DatosRecepcion = Record<typeof camposRequeridos[number], string>
	& Record<typeof camposOpcionales[number], string | null> & { fecha_ingreso: string };
export type RecepcionDb = DatosRecepcion & {
	id: number; fecha_entrega: string | null; created_at: string; updated_at: string;
	estado: 'en_taller' | 'entregada';
};
export type AccesorioDb = { id: number; recepcion_id: number; nombre: string; devuelto: number; created_at: string };

export class ErrorTaller extends Error {
	constructor(message: string, public status = 400) { super(message); }
}

export function validarRecepcion(body: Record<string, unknown>, actual?: RecepcionDb) {
	const permitidos: readonly string[] = [...camposRecepcion, 'accesorios'];
	if (Object.keys(body).some((campo) => !permitidos.includes(campo)) || !Object.keys(body).length) {
		throw new ErrorTaller('Campos de recepción inválidos');
	}
	const datos = {} as DatosRecepcion;
	const fecha = 'fecha_ingreso' in body ? body.fecha_ingreso : actual?.fecha_ingreso;
	if (!fechaValida(fecha)) throw new ErrorTaller('Fecha de ingreso inválida; usa YYYY-MM-DD');
	datos.fecha_ingreso = fecha;
	if (actual?.fecha_entrega && fecha > actual.fecha_entrega) {
		throw new ErrorTaller('La entrega no puede ser anterior al ingreso');
	}
	for (const campo of camposRequeridos) {
		const valor = campo in body ? body[campo] : actual?.[campo];
		if (typeof valor !== 'string' || !valor.trim()) throw new ErrorTaller(`${campo} es obligatorio`);
		datos[campo] = valor.trim();
	}
	for (const campo of camposOpcionales) {
		const valor = campo in body ? body[campo] : actual?.[campo];
		if (valor !== undefined && valor !== null && (typeof valor !== 'string' || !valor.trim())) {
			throw new ErrorTaller(`${campo} debe ser texto no vacío o null`);
		}
		datos[campo] = typeof valor === 'string' ? valor.trim() : null;
	}
	let accesorios: string[] | undefined;
	if ('accesorios' in body || !actual) {
		const valor = body.accesorios;
		if (!Array.isArray(valor) || valor.some((nombre) => typeof nombre !== 'string' || !nombre.trim())) {
			throw new ErrorTaller('Accesorios debe ser un arreglo de nombres no vacíos');
		}
		accesorios = valor.map((nombre: string) => nombre.trim());
		if (new Set(accesorios.map((nombre) => nombre.toLowerCase())).size !== accesorios.length) {
			throw new ErrorTaller('No se permiten accesorios duplicados');
		}
	}
	return { datos, accesorios };
}

export function validarEntrega(body: Record<string, unknown>, ingreso: string) {
	if (Object.keys(body).some((campo) => !['fecha_entrega', 'accesorios_devueltos'].includes(campo))) {
		throw new ErrorTaller('Campos de entrega inválidos');
	}
	const fecha = body.fecha_entrega;
	if (!fechaValida(fecha)) throw new ErrorTaller('Fecha de entrega inválida; usa YYYY-MM-DD');
	if (fecha < ingreso) throw new ErrorTaller('La entrega no puede ser anterior al ingreso');
	const ids = body.accesorios_devueltos;
	if (!Array.isArray(ids) || !ids.every(idValido) || new Set(ids).size !== ids.length) {
		throw new ErrorTaller('IDs de accesorios devueltos inválidos');
	}
	return { fecha, ids: ids as number[] };
}
