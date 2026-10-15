import { ErrorServicio, type TipoServicio } from './serviciosValidacion';

// Compatibilidad de etiquetas historicas en Excel. No valida ni condiciona operaciones nuevas.
function normalizarTrabajo(valor: unknown): string | null {
	if (valor === undefined || valor === null) return null;
	if (typeof valor !== 'string' || valor.length > 200) throw new ErrorServicio('Trabajo realizado inválido (máximo 200 caracteres)');
	return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
		.replace(/\s+/g, ' ').toUpperCase().replace(/(?:(?:^|\s+)(?:PRESENCIAL|REMOT[AO]))+$/, '').trim() || null;
}

export function productoComision(tipo: TipoServicio, trabajo: string | null | undefined) {
	if (tipo === 'instalacion') return 'INSTALACION PRESENCIAL';
	if (tipo === 'instalacion_remota') return 'INSTALACION REMOTA';
	return `${normalizarTrabajo(trabajo) ?? 'TRABAJO NO REGISTRADO'} ${tipo === 'servicio_presencial' ? 'PRESENCIAL' : 'REMOTA'}`;
}
