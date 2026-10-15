import { pagoTecnico, type ServicioDb } from './serviciosValidacion';

export type OperacionFinanzas = Pick<ServicioDb, 'tecnico_id' | 'tipo' | 'valor_servicio' | 'estado' | 'fecha_programada'> & {
	tecnico_nombre: string; tecnico_activo: number;
};
export type TecnicoFinanzas = {
	id: number; nombre: string; activo: number; servicios_con_pago: number;
	pendientes: number; en_proceso: number; realizados: number; pago_generado: number;
};

export function agregarFinanzas(operaciones: OperacionFinanzas[]) {
	const grupos = new Map<number, TecnicoFinanzas>();
	let pago = 0;
	let ingresos = 0;
	let cantidad = 0;
	for (const operacion of operaciones) {
		if (operacion.tipo === 'servicio_presencial' || operacion.tipo === 'servicio_remoto') ingresos += operacion.valor_servicio ?? 0;
		const generado = pagoTecnico(operacion);
		if (generado <= 0) continue;
		pago += generado; cantidad++;
		const tecnico = grupos.get(operacion.tecnico_id) ?? {
			id: operacion.tecnico_id, nombre: operacion.tecnico_nombre, activo: operacion.tecnico_activo,
			servicios_con_pago: 0, pendientes: 0, en_proceso: 0, realizados: 0, pago_generado: 0,
		};
		tecnico.servicios_con_pago++;
		tecnico.pago_generado += generado;
		if (operacion.estado === 'pendiente') tecnico.pendientes++;
		else if (operacion.estado === 'en_proceso') tecnico.en_proceso++;
		else tecnico.realizados++;
		grupos.set(tecnico.id, tecnico);
	}
	return {
		resumen: { ingresos_servicios: ingresos, pago_tecnicos: pago, servicios_con_pago: cantidad, tecnicos_con_actividad: grupos.size,
			promedio_por_servicio: cantidad ? pago / cantidad : 0 },
		tecnicos: [...grupos.values()].sort((a, b) => b.pago_generado - a.pago_generado
			|| a.nombre.localeCompare(b.nombre, 'es') || a.id - b.id),
	};
}

export function desplazarMesFinanzas(mes: string, desplazamiento: number) {
	const [anio, numero] = mes.split('-').map(Number);
	const indice = anio * 12 + numero - 1 + desplazamiento;
	return `${String(Math.floor(indice / 12)).padStart(4, '0')}-${String(indice % 12 + 1).padStart(2, '0')}`;
}

export function compararMes(total: number, anterior: number, mesAnterior: string) {
	return { mes_anterior: mesAnterior, pago_anterior: anterior, diferencia: total - anterior,
		porcentaje: anterior > 0 ? (total - anterior) / anterior * 100 : null };
}
