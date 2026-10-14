import { ErrorServicio } from './serviciosValidacion';

export const limiteComprobante = 5 * 1024 * 1024;
export const formatosComprobante: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function leerComprobante(request: Request) {
	if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data;')) {
		throw new ErrorServicio('Envía un archivo con multipart/form-data');
	}
	let formulario: FormData;
	try { formulario = await request.formData(); }
	catch { throw new ErrorServicio('El cuerpo multipart no es válido'); }
	const archivos = formulario.getAll('archivo');
	if (archivos.length !== 1 || !(archivos[0] instanceof File)) throw new ErrorServicio('Debes enviar un único archivo en el campo archivo');
	const archivo = archivos[0];
	if (!archivo.size) throw new ErrorServicio('El archivo está vacío');
	if (archivo.size > limiteComprobante) throw new ErrorServicio('El comprobante no puede superar 5 MB', 413);
	if (!Object.hasOwn(formatosComprobante, archivo.type)) throw new ErrorServicio('Solo se permiten imágenes JPEG, PNG o WebP');
	const cabecera = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
	const coincide = archivo.type === 'image/jpeg' ? [255, 216, 255].every((valor, i) => cabecera[i] === valor)
		: archivo.type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((valor, i) => cabecera[i] === valor)
			: new TextDecoder().decode(cabecera.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(cabecera.slice(8, 12)) === 'WEBP';
	if (!coincide) throw new ErrorServicio('El contenido del archivo no corresponde al formato de imagen indicado');
	// Nombre solo para mostrarlo; nunca decide la key ni se incorpora a headers sin escapar.
	const nombre = archivo.name.replace(/[\u0000-\u001f\u007f]/g, '').split(/[\\/]/).pop()?.trim().slice(0, 200) || 'Comprobante';
	return { archivo, nombre, mime: archivo.type, extension: formatosComprobante[archivo.type] };
}
