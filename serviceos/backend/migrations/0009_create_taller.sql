-- Validación de fechas equivalente a 0008 y trim equivalente a String.trim().
CREATE TABLE taller_recepciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_ingreso TEXT NOT NULL CHECK (
    typeof(fecha_ingreso) = 'text' AND length(fecha_ingreso) = 10
    AND fecha_ingreso GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND CAST(substr(fecha_ingreso, 1, 4) AS INTEGER) BETWEEN 1 AND 9999
    AND CAST(substr(fecha_ingreso, 6, 2) AS INTEGER) BETWEEN 1 AND 12
    AND CAST(substr(fecha_ingreso, 9, 2) AS INTEGER) BETWEEN 1 AND CASE
      WHEN substr(fecha_ingreso, 6, 2) = '02' THEN 28 + (
        CAST(substr(fecha_ingreso, 1, 4) AS INTEGER) % 4 = 0 AND (
          CAST(substr(fecha_ingreso, 1, 4) AS INTEGER) % 100 != 0
          OR CAST(substr(fecha_ingreso, 1, 4) AS INTEGER) % 400 = 0
        )
      )
      WHEN substr(fecha_ingreso, 6, 2) IN ('04', '06', '09', '11') THEN 30
      ELSE 31
    END
  ),
  cliente_nombre TEXT NOT NULL CHECK (
    typeof(cliente_nombre) = 'text' AND length(cliente_nombre) > 0
    AND cliente_nombre = trim(cliente_nombre, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
  ),
  cliente_telefono TEXT NOT NULL CHECK (
    typeof(cliente_telefono) = 'text' AND length(cliente_telefono) > 0
    AND cliente_telefono = trim(cliente_telefono, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
  ),
  maquina_tipo TEXT NOT NULL CHECK (
    typeof(maquina_tipo) = 'text' AND length(maquina_tipo) > 0
    AND maquina_tipo = trim(maquina_tipo, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
  ),
  falla_reportada TEXT NOT NULL CHECK (
    typeof(falla_reportada) = 'text' AND length(falla_reportada) > 0
    AND falla_reportada = trim(falla_reportada, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
  ),
  cliente_contacto TEXT CHECK (
    cliente_contacto IS NULL OR (
    typeof(cliente_contacto) = 'text' AND length(cliente_contacto) > 0
    AND cliente_contacto = trim(cliente_contacto, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
    )
  ),
  maquina_tamano TEXT CHECK (
    maquina_tamano IS NULL OR (
    typeof(maquina_tamano) = 'text' AND length(maquina_tamano) > 0
    AND maquina_tamano = trim(maquina_tamano, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
    )
  ),
  maquina_marca TEXT CHECK (
    maquina_marca IS NULL OR (
    typeof(maquina_marca) = 'text' AND length(maquina_marca) > 0
    AND maquina_marca = trim(maquina_marca, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
    )
  ),
  maquina_modelo TEXT CHECK (
    maquina_modelo IS NULL OR (
    typeof(maquina_modelo) = 'text' AND length(maquina_modelo) > 0
    AND maquina_modelo = trim(maquina_modelo, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
    )
  ),
  maquina_serial TEXT CHECK (
    maquina_serial IS NULL OR (
    typeof(maquina_serial) = 'text' AND length(maquina_serial) > 0
    AND maquina_serial = trim(maquina_serial, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
    )
  ),
  observaciones TEXT CHECK (
    observaciones IS NULL OR (
    typeof(observaciones) = 'text' AND length(observaciones) > 0
    AND observaciones = trim(observaciones, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
    )
  ),
  fecha_entrega TEXT CHECK (
    fecha_entrega IS NULL OR (
    typeof(fecha_entrega) = 'text' AND length(fecha_entrega) = 10
    AND fecha_entrega GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND CAST(substr(fecha_entrega, 1, 4) AS INTEGER) BETWEEN 1 AND 9999
    AND CAST(substr(fecha_entrega, 6, 2) AS INTEGER) BETWEEN 1 AND 12
    AND CAST(substr(fecha_entrega, 9, 2) AS INTEGER) BETWEEN 1 AND CASE
      WHEN substr(fecha_entrega, 6, 2) = '02' THEN 28 + (
        CAST(substr(fecha_entrega, 1, 4) AS INTEGER) % 4 = 0 AND (
          CAST(substr(fecha_entrega, 1, 4) AS INTEGER) % 100 != 0
          OR CAST(substr(fecha_entrega, 1, 4) AS INTEGER) % 400 = 0
        )
      )
      WHEN substr(fecha_entrega, 6, 2) IN ('04', '06', '09', '11') THEN 30
      ELSE 31
    END
    AND fecha_entrega >= fecha_ingreso
    )
  ),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE taller_accesorios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recepcion_id INTEGER NOT NULL REFERENCES taller_recepciones(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL COLLATE NOCASE CHECK (
    typeof(nombre) = 'text' AND length(nombre) > 0
    AND nombre = trim(nombre, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
  ),
  devuelto INTEGER NOT NULL DEFAULT 0 CHECK (devuelto IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (recepcion_id, nombre)
);

CREATE INDEX idx_taller_fecha_ingreso ON taller_recepciones(fecha_ingreso DESC, id DESC);
CREATE INDEX idx_taller_en_taller ON taller_recepciones(fecha_ingreso DESC, id DESC)
  WHERE fecha_entrega IS NULL;
CREATE INDEX idx_taller_entregadas ON taller_recepciones(fecha_ingreso DESC, id DESC)
  WHERE fecha_entrega IS NOT NULL;
CREATE INDEX idx_taller_fecha_entrega ON taller_recepciones(fecha_entrega)
  WHERE fecha_entrega IS NOT NULL;

