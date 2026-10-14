import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { empresa } from '../config/empresa';
import type { ServicioComision } from './comisionesConsulta';
import { esPresencial, pagoTecnico } from './serviciosValidacion';
import { productoComision } from './servicioTrabajo';

const columnas = ['FECHA', '# CELULAR', 'NOMBRE DEL CLIENTE', 'NOMBRE DEL PRODUCTO', 'CIUDAD',
	'CANTIDAD SERVICIOS', 'VALOR DEL SERVICIO', 'VALOR DEL PAGO COMISION'];
const morado = 'FF7030A0';
const moneda = '"$ "#,##0';

export function nombreHoja(nombre: string, usados: Set<string>) {
	const base = nombre.replace(/[\[\]:*?\/\\\x00-\x1f]/g, ' ').replace(/^'+|'+$/g, '').trim() || 'TECNICO';
	let candidato = base.slice(0, 31).replace(/'+$/g, '') || 'TECNICO';
	let numero = 2;
	while (usados.has(candidato.toUpperCase()) || candidato.toUpperCase() === 'HISTORY') {
		const sufijo = ` (${numero++})`;
		candidato = base.slice(0, 31 - sufijo.length) + sufijo;
	}
	usados.add(candidato.toUpperCase());
	return candidato;
}

function periodo(mes: string) {
	const [anio, numero] = mes.split('-').map(Number);
	const fecha = new Date(0);
	fecha.setUTCFullYear(anio, numero, 0);
	const nombre = new Intl.DateTimeFormat('es-CO', { month: 'long', timeZone: 'UTC' }).format(fecha).toUpperCase();
	return `DEL 1 AL ${fecha.getUTCDate()} DE ${nombre} DEL ${anio}`;
}

function agregarHoja(libro: ExcelJS.Workbook, nombre: string, servicios: ServicioComision[], mes: string, usados: Set<string>) {
	const hoja = libro.addWorksheet(nombreHoja(nombre.toUpperCase(), usados), {
		views: [{ showGridLines: false }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
	});
	hoja.columns = [14, 19, 30, 39, 20, 17, 23, 26].map(width => ({ width }));
	[empresa.nombre, `NIT: ${empresa.nit}`, 'FORMATO COMISIONES TECNICO', 'periodo', periodo(mes), `TECNICO: ${nombre.toUpperCase()}`]
		.forEach((texto, indice) => {
			const fila = indice + 1;
			hoja.mergeCells(fila, 1, fila, 8);
			const celda = hoja.getCell(fila, 1);
			celda.value = texto;
			celda.alignment = { horizontal: 'center', vertical: 'middle' };
			celda.font = { name: 'Arial', size: fila === 1 ? 16 : 12, bold: fila !== 4, color: { argb: fila <= 2 ? 'FFFFFFFF' : 'FF000000' } };
			if (fila <= 2) celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: morado } };
			hoja.getRow(fila).height = fila === 1 ? 32 : 25;
		});
	hoja.getRow(8).values = columnas;
	hoja.getRow(8).height = 40;
	let totalValor = 0;
	let totalPago = 0;
	for (const servicio of servicios) {
		const valor = servicio.tipo.startsWith('instalacion') ? pagoTecnico(servicio) : servicio.valor_servicio!;
		const pago = pagoTecnico(servicio);
		totalValor += valor; totalPago += pago;
		const [anio, mesFecha, dia] = servicio.fecha_programada.split('-');
		hoja.addRow([`${dia}/${mesFecha}/${anio}`, servicio.cliente_telefono, servicio.cliente_nombre,
			productoComision(servicio.tipo, servicio.trabajo_realizado), esPresencial(servicio.tipo) ? servicio.ciudad : 'REMOTO', 1, valor, pago]);
	}
	const fin = 8 + servicios.length;
	const totales = hoja.addRow(['TOTALES', '', '', '', '',
		{ formula: `SUM(F9:F${fin})`, result: servicios.length },
		{ formula: `SUM(G9:G${fin})`, result: totalValor }, { formula: `SUM(H9:H${fin})`, result: totalPago }]);
	hoja.mergeCells(totales.number, 1, totales.number, 5);
	for (let numero = 8; numero <= totales.number; numero++) {
		const fila = hoja.getRow(numero);
		fila.height = numero === 8 ? 40 : 32;
		for (let columna = 1; columna <= 8; columna++) {
			const celda = fila.getCell(columna);
			celda.font = { name: 'Arial', size: 10, bold: numero === 8 || numero === totales.number };
			celda.alignment = { vertical: 'middle', horizontal: columna >= 6 ? 'right' : 'center', wrapText: true };
			celda.border = Object.fromEntries(['top', 'left', 'bottom', 'right'].map(lado => [lado, { style: 'thin', color: { argb: 'FF555555' } }]));
			if (numero === 8 || numero === totales.number) celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4D5EF' } };
			if (numero > 8 && columna >= 7) celda.numFmt = moneda;
			if (numero > 8 && columna === 2) celda.numFmt = '@';
		}
	}
	hoja.pageSetup.printArea = `A1:H${totales.number}`;
}

export async function generarComisiones(servicios: ServicioComision[], mes: string) {
	const libro = new ExcelJS.Workbook();
	libro.creator = empresa.nombre;
	libro.calcProperties.fullCalcOnLoad = true;
	const grupos = new Map<number, ServicioComision[]>();
	for (const servicio of servicios) {
		const grupo = grupos.get(servicio.tecnico_id) ?? [];
		grupo.push(servicio); grupos.set(servicio.tecnico_id, grupo);
	}
	const usados = new Set<string>();
	for (const grupo of grupos.values()) agregarHoja(libro, grupo[0].tecnico_nombre, grupo, mes, usados);
	return new Uint8Array(await libro.xlsx.writeBuffer());
}
