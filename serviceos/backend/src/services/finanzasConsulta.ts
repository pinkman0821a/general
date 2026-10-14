import { agregarFinanzas, compararMes, desplazarMesFinanzas, type OperacionFinanzas } from './finanzasCalculo';
import { ErrorServicio, pagoTecnico, type ServicioDb } from './serviciosValidacion';

async function consultarOperaciones(env: Env, inicio: string, fin: string, tecnicoId?: number) {
	const resultado = await env.DB.prepare(`SELECT s.tecnico_id, s.tipo, s.valor_servicio, s.estado, s.fecha_programada,
		u.nombre AS tecnico_nombre, u.activo AS tecnico_activo FROM servicios s JOIN usuarios u ON u.id = s.tecnico_id
		WHERE s.fecha_programada BETWEEN ? AND ? ${tecnicoId === undefined ? '' : 'AND s.tecnico_id = ?'}`)
		.bind(`${inicio}-01`, `${fin}-31`, ...(tecnicoId === undefined ? [] : [tecnicoId])).all<OperacionFinanzas>();
	return resultado.results;
}

export async function consultarResumenFinanzasMes(env: Env, mes: string) {
	return agregarFinanzas(await consultarOperaciones(env, mes, mes)).resumen;
}

export async function consultarFinanzas(env: Env, mes: string) {
	const meses = Array.from({ length: 6 }, (_, indice) => desplazarMesFinanzas(mes, indice - 5));
	// Una lectura obtiene los campos mínimos de los seis meses y una vista consistente para la pantalla.
	const operaciones = await consultarOperaciones(env, meses[0], mes);
	const porMes = new Map(meses.map(valor => [valor, [] as OperacionFinanzas[]]));
	for (const operacion of operaciones) porMes.get(operacion.fecha_programada.slice(0, 7))?.push(operacion);
	const agregados = meses.map(valor => agregarFinanzas(porMes.get(valor)!));
	const actual = agregados[5];
	return { mes, ...actual,
		historico_tecnicos: meses.map((valor, indice) => ({ mes: valor, tecnicos: agregados[indice].tecnicos })).reverse(),
		historico: meses.map((valor, indice) => ({ mes: valor, pago_generado: agregados[indice].resumen.pago_tecnicos })),
		comparacion: compararMes(actual.resumen.pago_tecnicos, agregados[4].resumen.pago_tecnicos, meses[4]),
	};
}

export function mesActualFinanciero(fecha = new Date()) {
	const partes = new Intl.DateTimeFormat('en', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).formatToParts(fecha);
	return `${partes.find(parte => parte.type === 'year')!.value}-${partes.find(parte => parte.type === 'month')!.value}`;
}

export async function consultarResumenPersonal(env: Env, tecnicoId: number, mes = mesActualFinanciero()) {
	const { resumen } = agregarFinanzas(await consultarOperaciones(env, mes, mes, tecnicoId));
	return { mes, pago_generado: resumen.pago_tecnicos, servicios_con_pago: resumen.servicios_con_pago };
}

type DetalleOperacion = Pick<ServicioDb, 'id' | 'fecha_programada' | 'cliente_nombre' | 'tipo' | 'estado' | 'valor_servicio'>;

export async function consultarDetalleFinanzas(env: Env, mes: string, id: number) {
	const tecnico = await env.DB.prepare("SELECT id, nombre, activo FROM usuarios WHERE id = ? AND rol = 'tecnico'")
		.bind(id).first<{ id: number; nombre: string; activo: number }>();
	if (!tecnico) throw new ErrorServicio('Técnico no encontrado', 404);
	const resultado = await env.DB.prepare(`SELECT id, fecha_programada, cliente_nombre, tipo, estado, valor_servicio
		FROM servicios WHERE tecnico_id = ? AND fecha_programada BETWEEN ? AND ? ORDER BY fecha_programada ASC, id ASC`)
		.bind(id, `${mes}-01`, `${mes}-31`).all<DetalleOperacion>();
	const servicios = resultado.results.map(servicio => ({ ...servicio, pago_tecnico: pagoTecnico(servicio) }))
		.filter(servicio => servicio.pago_tecnico > 0);
	return { mes, tecnico, servicios, pago_generado: servicios.reduce((total, servicio) => total + servicio.pago_tecnico, 0) };
}
