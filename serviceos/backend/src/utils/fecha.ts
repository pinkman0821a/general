export function fechaValida(valor: unknown): valor is string {
	if (typeof valor !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(valor)) return false;
	if (valor.startsWith('0000-')) return false;
	const fecha = new Date(`${valor}T00:00:00.000Z`);
	return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}
