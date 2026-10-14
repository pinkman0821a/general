import { ErrorServicio } from './serviciosValidacion';

export const formatosFoto: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const maximoFotosMensaje = 'Puedes adjuntar máximo 5 fotos por servicio.';

export async function validarFoto(archivo: File) {
	if (!archivo.size) throw new ErrorServicio('La foto está vacía');
	if (archivo.size > 5 * 1024 * 1024) throw new ErrorServicio('Cada foto puede pesar máximo 5 MB', 413);
	if (!Object.hasOwn(formatosFoto, archivo.type)) throw new ErrorServicio('Solo se permiten fotos JPEG, PNG o WebP');
	const bytes = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
	const coincide = archivo.type === 'image/jpeg' ? [255, 216, 255].every((valor, i) => bytes[i] === valor)
		: archivo.type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((valor, i) => bytes[i] === valor)
			: new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
	if (!coincide) throw new ErrorServicio('El contenido de la foto no corresponde al formato indicado');
	const nombre = archivo.name.replace(/[\u0000-\u001f\u007f]/g, '').split(/[\\/]/).pop()?.trim().slice(0, 200) || 'Foto';
	return { archivo, nombre, mime: archivo.type, extension: formatosFoto[archivo.type] };
}

export async function leerFotos(request: Request) {
	if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data;')) throw new ErrorServicio('Envía fotos con multipart/form-data');
	let formulario: FormData;
	try { formulario = await request.formData(); } catch { throw new ErrorServicio('El cuerpo multipart no es válido'); }
	if ([...formulario.keys()].some(key => !['archivos', 'eliminar'].includes(key))) throw new ErrorServicio('Campos de fotos inválidos');
	const archivos = formulario.getAll('archivos');
	if (archivos.length > 5) throw new ErrorServicio(maximoFotosMensaje);
	if (archivos.some(archivo => !(archivo instanceof File))) throw new ErrorServicio('El campo archivos debe contener fotos');
	let eliminar: number[];
	try { eliminar = JSON.parse(String(formulario.get('eliminar') ?? '[]')); }
	catch { throw new ErrorServicio('Fotos a eliminar inválidas'); }
	if (!Array.isArray(eliminar) || eliminar.length > 5 || eliminar.some(id => !Number.isSafeInteger(id) || id <= 0)
		|| new Set(eliminar).size !== eliminar.length || formulario.getAll('eliminar').length > 1) throw new ErrorServicio('Fotos a eliminar inválidas');
	if (!archivos.length && !eliminar.length) throw new ErrorServicio('Selecciona al menos una foto o una eliminación');
	const lote = request.headers.get('Idempotency-Key') ?? crypto.randomUUID();
	if (!/^[a-zA-Z0-9-]{16,80}$/.test(lote)) throw new ErrorServicio('Identificador de subida inválido');
	const fotos = [];
	for (const archivo of archivos) fotos.push(await validarFoto(archivo as File));
	return { fotos, eliminar, lote };
}
