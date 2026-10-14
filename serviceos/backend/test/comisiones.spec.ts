import { env } from 'cloudflare:workers';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cookies, crear, detalle, error, migrar, pedir, preparar, remoto } from './serviciosAyudas';
import { nombreHoja } from '../src/services/comisionesWorkbook';
import { generarComisiones } from '../src/services/comisionesWorkbook';
import type { ServicioComision } from '../src/services/comisionesConsulta';
import { empresa } from '../src/config/empresa';

beforeAll(migrar);
beforeEach(preparar);

async function realizado(cambios: Record<string, unknown> = {}) {
	const servicio = await crear({ ...remoto, trabajo_realizado: 'CALIBRACION', confirmar_sobrecarga: true, ...cambios });
	await detalle(await pedir('PATCH', `/${servicio.id}/estado`, { estado: 'realizado' }));
	return servicio;
}

async function leer(cookie = cookies.coordinador, filtros = '') {
	const respuesta = await pedir('GET', `/comisiones.xlsx?mes=2026-10${filtros}`, undefined, cookie);
	expect(respuesta.status).toBe(200);
	expect(respuesta.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	expect(respuesta.headers.get('Content-Disposition')).toMatch(/attachment; filename="comisiones-.+-2026-10.xlsx"/);
	expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
	const libro = new ExcelJS.Workbook();
	await libro.xlsx.load(await respuesta.arrayBuffer());
	return { libro, respuesta };
}

describe('Excel comisiones: generación y lectura reales dentro de Workers', () => {
	it('técnico solo exporta lo suyo y coordinador exporta todas las hojas con datos', async () => {
		await realizado({ cliente_nombre: 'Propio' });
		await realizado({ tecnico_id: 3, cliente_nombre: 'Ajeno' });
		await env.DB.prepare("UPDATE usuarios SET nombre = 'Andres Tecnico' WHERE id = 2").run();
		const tecnico = await leer(cookies.tecnico);
		expect(tecnico.libro.worksheets.map(hoja => hoja.name)).toEqual(['ANDRES TECNICO']);
		expect(tecnico.libro.worksheets[0].getCell('C9').value).toBe('Propio');
		expect(tecnico.respuesta.headers.get('Content-Disposition')).toBe('attachment; filename="comisiones-andres-tecnico-2026-10.xlsx"');
		const coordinador = await leer(cookies.coordinador, '&tecnico_id=2&estado=pendiente&tipo=garantia&buscar=imposible');
		expect(coordinador.libro.worksheets.map(hoja => hoja.name)).toEqual(['ANDRES TECNICO', 'CARLOS']);
		expect(coordinador.libro.worksheets[1].getCell('C9').value).toBe('Ajeno');
		expect(coordinador.respuesta.headers.get('Content-Disposition')).toBe('attachment; filename="comisiones-tecnicos-2026-10.xlsx"');
		await error(await pedir('GET', '/comisiones.xlsx?mes=2026-10&tecnico_id=3', undefined, cookies.tecnico), 403);
	});
	it('excluye garantías, pendiente, en proceso y otro mes; mantiene orden fecha e id', async () => {
		await realizado({ tipo: 'garantia', ciudad: 'Bogotá', direccion: 'Calle', valor_servicio: null, cliente_nombre: 'Garantia' });
		await crear({ ...remoto, cliente_nombre: 'Pendiente' });
		const proceso = await crear({ ...remoto, cliente_nombre: 'Proceso' });
		await detalle(await pedir('PATCH', `/${proceso.id}/estado`, { estado: 'en_proceso' }));
		await realizado({ fecha_programada: '2026-09-30', cliente_nombre: 'Septiembre' });
		await realizado({ fecha_programada: '2026-10-31', cliente_nombre: 'Ultimo' });
		await realizado({ fecha_programada: '2026-10-01', cliente_nombre: 'Primero' });
		await realizado({ fecha_programada: '2026-10-01', cliente_nombre: 'Segundo' });
		const { libro } = await leer();
		const hoja = libro.worksheets[0];
		expect([9, 10, 11].map(fila => hoja.getCell(`C${fila}`).value)).toEqual(['Primero', 'Segundo', 'Ultimo']);
		expect(hoja.rowCount).toBe(12);
		expect(hoja.getCell('F12').value).toEqual({ formula: 'SUM(F9:F11)', result: 3 });
	});
	it('mapea los cuatro tipos, formato empresarial, teléfono texto y totales exactos', async () => {
		await realizado({ tipo: 'servicio_presencial', ciudad: 'Bogotá', direccion: 'Calle', valor_servicio: 250001,
			trabajo_realizado: 'mantenimiento presencial', cliente_telefono: '003001234567' });
		await realizado({ valor_servicio: 4, trabajo_realizado: 'instalación programa y perfiles remota' });
		await realizado({ tipo: 'instalacion', ciudad: 'Cali', direccion: 'Calle', valor_servicio: null, trabajo_realizado: null });
		await realizado({ tipo: 'instalacion_remota', valor_servicio: null, trabajo_realizado: null });
		const { libro } = await leer();
		const hoja = libro.worksheets[0];
		expect(hoja.getCell('A1').value).toBe(empresa.nombre);
		expect(hoja.getCell('A2').value).toBe(`NIT: ${empresa.nit}`);
		expect(hoja.getCell('A3').value).toBe('FORMATO COMISIONES TECNICO');
		expect(hoja.getCell('A5').value).toBe('DEL 1 AL 31 DE OCTUBRE DEL 2026');
		expect(hoja.getCell('A6').value).toBe('TECNICO: JUAN');
		expect(hoja.getRow(8).values).toEqual([undefined, 'FECHA', '# CELULAR', 'NOMBRE DEL CLIENTE', 'NOMBRE DEL PRODUCTO',
			'CIUDAD', 'CANTIDAD SERVICIOS', 'VALOR DEL SERVICIO', 'VALOR DEL PAGO COMISION']);
		expect(hoja.getCell('A9').value).toBe('15/10/2026');
		expect(hoja.getCell('B9').value).toBe('003001234567');
		expect(hoja.getCell('B9').type).toBe(ExcelJS.ValueType.String);
		expect(hoja.getCell('B9').numFmt).toBe('@');
		expect([9, 10, 11, 12].map(fila => hoja.getCell(`D${fila}`).value)).toEqual([
			'MANTENIMIENTO PRESENCIAL', 'INSTALACION PROGRAMA Y PERFILES REMOTA', 'INSTALACION PRESENCIAL', 'INSTALACION REMOTA']);
		expect([9, 10, 11, 12].map(fila => hoja.getCell(`E${fila}`).value)).toEqual(['Bogotá', 'REMOTO', 'Cali', 'REMOTO']);
		expect([9, 10, 11, 12].map(fila => hoja.getCell(`G${fila}`).value)).toEqual([250001, 4, 100000, 50000]);
		expect([9, 10, 11, 12].map(fila => hoja.getCell(`H${fila}`).value)).toEqual([100000, 2, 100000, 50000]);
		expect([9, 10, 11, 12].map(fila => hoja.getCell(`F${fila}`).value)).toEqual([1, 1, 1, 1]);
		expect(hoja.getCell('F13').value).toEqual({ formula: 'SUM(F9:F12)', result: 4 });
		expect(hoja.getCell('G13').value).toEqual({ formula: 'SUM(G9:G12)', result: 400005 });
		expect(hoja.getCell('H13').value).toEqual({ formula: 'SUM(H9:H12)', result: 250002 });
		expect(hoja.getCell('H9').numFmt).toBe('"$ "#,##0');
		expect(hoja.getCell('H9').border.bottom?.style).toBe('thin');
		expect(hoja.getCell('A1').fill).toMatchObject({ fgColor: { argb: 'FF7030A0' } });
		expect(hoja.getCell('A1').alignment.horizontal).toBe('center');
	});
	it('sanitiza hojas, limita a 31 y evita colisiones sin distinguir mayúsculas', () => {
		const usados = new Set<string>();
		for (const nombre of ['A'.repeat(40), 'A'.repeat(40), 'History', "'", '?:/\\[]*', 'Juan', 'JUAN']) {
			const hoja = nombreHoja(nombre, usados);
			expect(hoja.length).toBeLessThanOrEqual(31);
			expect(hoja).not.toMatch(/[\[\]:*?\/\\]/);
		}
		expect(usados.size).toBe(7);
	});
	it('genera y lee un mes grande sin requerir Web Workers ni Node compatibility', async () => {
		const servicio = await realizado();
		const filas = Array.from({ length: 600 }, (_, indice) => ({ ...servicio, id: indice + 1, tecnico_nombre: 'Juan',
			cliente_nombre: `Cliente ${indice + 1}`, created_at: '', updated_at: '' } as ServicioComision));
		const archivo = await generarComisiones(filas, '2024-02');
		const libro = new ExcelJS.Workbook();
		await libro.xlsx.load(archivo.buffer as ArrayBuffer);
		const hoja = libro.worksheets[0];
		expect(hoja.getCell('A5').value).toBe('DEL 1 AL 29 DE FEBRERO DEL 2024');
		expect(hoja.getCell('C608').value).toBe('Cliente 600');
		expect(hoja.getCell('H609').value).toEqual({ formula: 'SUM(H9:H608)', result: 60000000 });
	});
	it.each(['', '?mes=2026-1', '?mes=2026-00', '?mes=2026-13', '?mes=0000-01', '?mes=2026-10-01',
		'?mes=2026-10&mes=2026-11'])('mes estricto %s', async consulta => {
		await error(await pedir('GET', `/comisiones.xlsx${consulta}`), 400);
	});
	it('sin datos devuelve código de negocio incluso si solo hay realizados ajenos o garantías', async () => {
		const vacio = await pedir('GET', '/comisiones.xlsx?mes=2026-10');
		expect(vacio.status).toBe(400);
		expect(await vacio.json()).toMatchObject({ codigo: 'sin_servicios_realizados' });
		await realizado({ tipo: 'garantia', ciudad: 'Bogotá', direccion: 'Calle', valor_servicio: null });
		await realizado({ tecnico_id: 3 });
		const tecnico = await pedir('GET', '/comisiones.xlsx?mes=2026-10', undefined, cookies.tecnico);
		expect(await tecnico.json()).toMatchObject({ codigo: 'sin_servicios_realizados' });
	});
	it('no autenticado no exporta ni recibe resumen', async () => {
		for (const ruta of ['comisiones.xlsx', 'resumen-pagos']) await error(await pedir('GET', `/${ruta}?mes=2026-10`, undefined, ''), 401);
	});
});
