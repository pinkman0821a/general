const sugerenciasTrabajo = ['REVISION', 'CALIBRACION', 'MANTENIMIENTO', 'PERFILACION',
  'INSTALACION PROGRAMA', 'INSTALACION PROGRAMA Y PERFILES', 'OTRO'];

export default function TrabajoRealizado({ valor, cambiar, ocupado }: {
  valor: string; cambiar: (valor: string) => void; ocupado: boolean;
}) {
  return <label className="servicios-control-estado">Trabajo realizado
    <input aria-label="Trabajo realizado" list="trabajos-comunes" maxLength={200} value={valor}
      disabled={ocupado} onChange={evento => cambiar(evento.target.value)} placeholder="Escribe o elige un trabajo" />
    <datalist id="trabajos-comunes">{sugerenciasTrabajo.map(trabajo => <option key={trabajo} value={trabajo} />)}</datalist>
    <small>Necesario antes de marcar Realizado. Puedes escribir otro trabajo.</small>
  </label>;
}
