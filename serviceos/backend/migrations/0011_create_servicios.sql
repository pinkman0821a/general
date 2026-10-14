-- Servicios vigentes e historicos. El pago y la ocupacion se derivan de la fila actual.
CREATE TABLE servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('garantia', 'servicio_presencial', 'servicio_remoto', 'instalacion', 'instalacion_remota')),
  cliente_nombre TEXT NOT NULL CHECK (
    typeof(cliente_nombre) = 'text' AND length(cliente_nombre) > 0
    AND cliente_nombre = trim(cliente_nombre, char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279))
  ),
  cliente_telefono TEXT NOT NULL CHECK (
    typeof(cliente_telefono) = 'text' AND length(cliente_telefono) > 0
    AND cliente_telefono = trim(cliente_telefono, char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279))
  ),
  ciudad TEXT CHECK (
    ciudad IS NULL OR (typeof(ciudad) = 'text' AND length(ciudad) > 0
    AND ciudad = trim(ciudad, char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)))
  ),
  direccion TEXT CHECK (
    direccion IS NULL OR (typeof(direccion) = 'text' AND length(direccion) > 0
    AND direccion = trim(direccion, char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)))
  ),
  fecha_programada TEXT NOT NULL CHECK (
    typeof(fecha_programada) = 'text' AND length(fecha_programada) = 10
    AND fecha_programada GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND CAST(substr(fecha_programada, 1, 4) AS INTEGER) BETWEEN 1 AND 9999
    AND CAST(substr(fecha_programada, 6, 2) AS INTEGER) BETWEEN 1 AND 12
    AND CAST(substr(fecha_programada, 9, 2) AS INTEGER) BETWEEN 1 AND CASE
      WHEN substr(fecha_programada, 6, 2) = '02' THEN 28 + (
        CAST(substr(fecha_programada, 1, 4) AS INTEGER) % 4 = 0 AND (
          CAST(substr(fecha_programada, 1, 4) AS INTEGER) % 100 != 0
          OR CAST(substr(fecha_programada, 1, 4) AS INTEGER) % 400 = 0
        )
      )
      WHEN substr(fecha_programada, 6, 2) IN ('04', '06', '09', '11') THEN 30
      ELSE 31
    END
  ),
  tecnico_id INTEGER NOT NULL REFERENCES usuarios(id),
  maquina TEXT NOT NULL CHECK (
    typeof(maquina) = 'text' AND length(maquina) > 0
    AND maquina = trim(maquina, char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279))
  ),
  tipo_falla TEXT CHECK (
    tipo_falla IS NULL OR (typeof(tipo_falla) = 'text' AND length(tipo_falla) > 0
    AND tipo_falla = trim(tipo_falla, char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)))
  ),
  tarjeteria TEXT CHECK (
    tarjeteria IS NULL OR (typeof(tarjeteria) = 'text' AND length(tarjeteria) > 0
    AND tarjeteria = trim(tarjeteria, char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)))
  ),
  cabezal TEXT CHECK (
    cabezal IS NULL OR (typeof(cabezal) = 'text' AND length(cabezal) > 0
    AND cabezal = trim(cabezal, char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)))
  ),
  observaciones TEXT CHECK (
    observaciones IS NULL OR (typeof(observaciones) = 'text' AND length(observaciones) > 0
    AND observaciones = trim(observaciones, char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)))
  ),
  valor_servicio INTEGER NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'realizado')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (tipo IN ('instalacion', 'instalacion_remota') AND tipo_falla IS NULL)
    OR (tipo IN ('garantia', 'servicio_presencial', 'servicio_remoto') AND tipo_falla IS NOT NULL)
  ),
  CHECK (
    (tipo IN ('garantia', 'servicio_presencial', 'instalacion') AND ciudad IS NOT NULL AND direccion IS NOT NULL)
    OR (tipo IN ('servicio_remoto', 'instalacion_remota') AND ciudad IS NULL AND direccion IS NULL)
  ),
  CHECK (
    (tipo IN ('servicio_presencial', 'servicio_remoto') AND valor_servicio IS NOT NULL
      AND typeof(valor_servicio) = 'integer' AND valor_servicio > 0)
    OR (tipo IN ('garantia', 'instalacion', 'instalacion_remota') AND valor_servicio IS NULL)
  )
);

-- El rango mensual utiliza el indice por fecha, sin transformar la columna.
CREATE INDEX idx_servicios_fecha ON servicios(fecha_programada, id);
CREATE INDEX idx_servicios_tecnico_fecha ON servicios(tecnico_id, fecha_programada, id);
CREATE INDEX idx_servicios_estado ON servicios(estado, fecha_programada, id);
CREATE INDEX idx_servicios_tipo ON servicios(tipo, fecha_programada, id);
