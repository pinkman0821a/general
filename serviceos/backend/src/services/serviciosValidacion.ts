import { idValido } from '../routes/rutaComun';
import { fechaValida } from '../utils/fecha';
import { comprobarTrabajo, normalizarTrabajo } from './servicioTrabajo';

export const tiposServicio = ['garantia', 'servicio_presencial', 'servicio_remoto', 'instalacion', 'instalacion_remota'] as const;
export const estadosServicio = ['pendiente', 'en_proceso', 'realizado'] as const;
export type TipoServicio = typeof tiposServicio[number];
export type EstadoServicio = typeof estadosServicio[number];
export type DatosServicio = {
	tipo: TipoServicio;
	cliente_nombre: string;
	cliente_telefono: string;
	ciudad: string | null;
	direccion: string | null;
	fecha_programada: string;
	tecnico_id: number;
	maquina: string;
	tipo_falla: string | null;
	tarjeteria: string | null;
	cabezal: string | null;
	observaciones: string | null;
	valor_servicio: number | null;
	trabajo_realizado?: string | null;
};
export type ServicioDb = DatosServicio & {
	id: number;
	estado: EstadoServicio;
	created_at: string;
	updated_at: string;
	comprobante_key?: string | null;
	comprobante_nombre?: string | null;
	comprobante_mime?: string | null;
	comprobante_size?: number | null;
	comprobante_updated_at?: string | null;
};
export class ErrorServicio extends Error {
	constructor(message: string, public status = 400) { super(message); }
}
export class ErrorSobrecarga extends ErrorServicio {
	constructor(public presencialesExistentes: number) {
		super('El tecnico ya tiene servicios presenciales programados para esta fecha', 409);
	}
}
export function esPresencial(tipo: TipoServicio) {
	return ['garantia', 'servicio_presencial', 'instalacion'].includes(tipo);
}
export function admiteComprobante(tipo: TipoServicio) {
	return tipo === 'servicio_presencial' || tipo === 'servicio_remoto';
}
export function pagoTecnico(servicio: Pick<DatosServicio, 'tipo' | 'valor_servicio'>) {
	return servicio.tipo === 'garantia' ? 0 : servicio.tipo === 'instalacion' ? 100000
		: servicio.tipo === 'instalacion_remota' ? 50000 : Math.round(servicio.valor_servicio! * 0.40);
}
export function respuestaServicio(servicio: ServicioDb, rol?: 'coordinador' | 'tecnico', detalle = false) {
	const pago = pagoTecnico(servicio);
	// Proyección explícita: ni la key ni futuros campos administrativos se filtran por SELECT *.
	const datos = Object.fromEntries(camposServicio.map(campo => [campo, servicio[campo]])) as DatosServicio;
	const publico = { ...datos, id: servicio.id, estado: servicio.estado, created_at: servicio.created_at,
		updated_at: servicio.updated_at, pago_tecnico: pago, ocupa_calendario: esPresencial(servicio.tipo) };
	if (rol !== 'coordinador' || !detalle || !admiteComprobante(servicio.tipo)) return publico;
	return { ...publico, tiene_comprobante: !!servicio.comprobante_key,
		comprobante_nombre: servicio.comprobante_nombre ?? null, comprobante_mime: servicio.comprobante_mime ?? null,
		comprobante_size: servicio.comprobante_size ?? null };
}
export const camposServicio = ['tipo', 'cliente_nombre', 'cliente_telefono', 'ciudad', 'direccion',
	'fecha_programada', 'tecnico_id', 'maquina', 'tipo_falla', 'tarjeteria', 'cabezal', 'observaciones', 'valor_servicio', 'trabajo_realizado'] as const;

export function validarServicio(body: Record<string, unknown>, actual?: ServicioDb): DatosServicio {
	if (!Object.keys(body).length || Object.keys(body).some((campo) => campo !== 'confirmar_sobrecarga'
		&& !camposServicio.includes(campo as typeof camposServicio[number]))) {
		throw new ErrorServicio('Campos de servicio inválidos');
	}
	if ('confirmar_sobrecarga' in body && typeof body.confirmar_sobrecarga !== 'boolean') {
		throw new ErrorServicio('confirmar_sobrecarga debe ser booleano');
	}
	const datos: Record<string, unknown> = { ...actual, ...body };
	datos.trabajo_realizado = normalizarTrabajo(datos.trabajo_realizado);
	if (!tiposServicio.includes(datos.tipo as TipoServicio)) throw new ErrorServicio('Tipo inválido');
	if (!fechaValida(datos.fecha_programada)) throw new ErrorServicio('Fecha programada inválida');
	if (!idValido(datos.tecnico_id)) throw new ErrorServicio('Técnico inválido');
	for (const campo of ['cliente_nombre', 'cliente_telefono', 'maquina']) {
		if (typeof datos[campo] !== 'string' || !(datos[campo] as string).trim()) throw new ErrorServicio(`${campo} es obligatorio`);
		datos[campo] = (datos[campo] as string).trim();
	}
	if (datos.tipo === 'instalacion' || datos.tipo === 'instalacion_remota') {
		datos.tipo_falla = null;
	} else {
		if (typeof datos.tipo_falla !== 'string' || !datos.tipo_falla.trim()) throw new ErrorServicio('tipo_falla es obligatorio');
		datos.tipo_falla = datos.tipo_falla.trim();
	}
	for (const campo of ['ciudad', 'direccion', 'tarjeteria', 'cabezal', 'observaciones']) {
		if (datos[campo] === undefined || datos[campo] === null) datos[campo] = null;
		else if (typeof datos[campo] !== 'string' || !(datos[campo] as string).trim()) throw new ErrorServicio(`${campo} inválido`);
		else datos[campo] = (datos[campo] as string).trim();
	}
	if (esPresencial(datos.tipo as TipoServicio)) {
		if (!datos.ciudad || !datos.direccion) throw new ErrorServicio('Ciudad y dirección obligatorias');
	} else if (datos.ciudad !== null || datos.direccion !== null) throw new ErrorServicio('Un remoto no admite ubicación');
	if (['servicio_presencial', 'servicio_remoto'].includes(datos.tipo as string)) {
		if (!idValido(datos.valor_servicio)) throw new ErrorServicio('Valor del servicio debe ser entero positivo en COP');
	} else {
		if (datos.valor_servicio !== undefined && datos.valor_servicio !== null) throw new ErrorServicio('Este tipo no admite valor del servicio');
		datos.valor_servicio = null;
	}
	if (actual && ('trabajo_realizado' in body || actual.tipo !== datos.tipo)) {
		comprobarTrabajo(datos.tipo as TipoServicio, actual.estado, datos.trabajo_realizado as string | null);
	}
	return Object.fromEntries(camposServicio.map((campo) => [campo, datos[campo]])) as DatosServicio;
}

export function validarEstado(body: Record<string, unknown>): EstadoServicio {
	if (Object.keys(body).some(campo => !['estado', 'trabajo_realizado'].includes(campo)) || !estadosServicio.includes(body.estado as EstadoServicio)) {
		throw new ErrorServicio('Solo se admite un estado válido');
	}
	return body.estado as EstadoServicio;
}
