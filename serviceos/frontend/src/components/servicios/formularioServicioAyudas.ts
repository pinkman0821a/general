import type { DatosServicio, PayloadServicio, Servicio, TipoServicio } from '../../services/serviciosService';
import { admiteValor, esPresencial, fechaLocal, mesActual, requiereFalla } from './serviciosAyudas';

export type ValoresFormulario = Record<Exclude<keyof DatosServicio, 'tipo'>, string> & { tipo: TipoServicio };
export function valoresIniciales(servicio?: Servicio): ValoresFormulario {
  const hoy = new Date();
  const valores: ValoresFormulario = {
    tipo: 'servicio_presencial', cliente_nombre: '', cliente_telefono: '',
    fecha_programada: `${mesActual(hoy)}-${String(hoy.getDate()).padStart(2, '0')}`,
    tecnico_id: '', maquina: '', tipo_falla: '', ciudad: '', direccion: '',
    tarjeteria: '', cabezal: '', observaciones: '', valor_servicio: '', trabajo_realizado: '',
  };
  if (servicio) {
    for (const campo of Object.keys(valores) as (keyof ValoresFormulario)[]) {
      if (campo !== 'tipo') valores[campo] = String(servicio[campo] ?? '');
    }
    valores.tipo = servicio.tipo;
  }
  return valores;
}
export function cambiarTipo(valores: ValoresFormulario, tipo: TipoServicio): ValoresFormulario {
  return {
    ...valores, tipo,
    ciudad: esPresencial(tipo) ? valores.ciudad : '',
    direccion: esPresencial(tipo) ? valores.direccion : '',
    valor_servicio: admiteValor(tipo) ? valores.valor_servicio : '',
    tipo_falla: requiereFalla(tipo) ? valores.tipo_falla : '',
  };
}
export function construirPayload(valores: ValoresFormulario, actual?: Servicio): PayloadServicio {
  const datos: DatosServicio = {
    tipo: valores.tipo, cliente_nombre: valores.cliente_nombre.trim(),
    cliente_telefono: valores.cliente_telefono.trim(), fecha_programada: valores.fecha_programada,
    tecnico_id: Number(valores.tecnico_id), maquina: valores.maquina.trim(),
    tipo_falla: requiereFalla(valores.tipo) ? valores.tipo_falla.trim() : null,
    tarjeteria: valores.tarjeteria.trim() || null, cabezal: valores.cabezal.trim() || null,
    observaciones: valores.observaciones.trim() || null,
  };
  if (actual) datos.trabajo_realizado = valores.trabajo_realizado?.trim() || null;
  if (!datos.cliente_nombre || !datos.cliente_telefono || !datos.maquina) {
    throw new Error('Completa cliente, teléfono y máquina.');
  }
  if (requiereFalla(datos.tipo) && !datos.tipo_falla) throw new Error('Completa el tipo de falla.');
  if (!Number.isSafeInteger(datos.tecnico_id) || datos.tecnico_id <= 0) throw new Error('Selecciona un técnico activo.');
  const fecha = fechaLocal(datos.fecha_programada);
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(datos.fecha_programada)
    || `${mesActual(fecha)}-${String(fecha.getDate()).padStart(2, '0')}` !== datos.fecha_programada) {
    throw new Error('La fecha programada es inválida.');
  }
  if (esPresencial(datos.tipo)) {
    datos.ciudad = valores.ciudad.trim(); datos.direccion = valores.direccion.trim();
    if (!datos.ciudad || !datos.direccion) throw new Error('Completa ciudad y dirección para un servicio presencial.');
  } else if (actual) {
    // PATCH combina los campos con la fila existente: null borra una ubicación anterior.
    datos.ciudad = null; datos.direccion = null;
  }
  if (admiteValor(datos.tipo)) {
    if (!/^\d+$/.test(valores.valor_servicio) || !Number.isSafeInteger(Number(valores.valor_servicio))
      || Number(valores.valor_servicio) <= 0) throw new Error('El valor debe ser un entero positivo en COP, sin decimales.');
    datos.valor_servicio = Number(valores.valor_servicio);
  } else if (actual) datos.valor_servicio = null;
  if (!actual) return datos;
  return Object.fromEntries(Object.entries(datos).filter(([campo, valor]) =>
    (actual[campo as keyof DatosServicio] ?? null) !== valor)) as PayloadServicio;
}
