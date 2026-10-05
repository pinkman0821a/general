CREATE TABLE tecnico_indisponibilidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tecnico_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL CHECK (
    length(fecha) = 10
    AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND CAST(substr(fecha, 1, 4) AS INTEGER) BETWEEN 1 AND 9999
    AND CAST(substr(fecha, 6, 2) AS INTEGER) BETWEEN 1 AND 12
    AND CAST(substr(fecha, 9, 2) AS INTEGER) BETWEEN 1 AND CASE
      WHEN substr(fecha, 6, 2) = '02' THEN 28 + (
        CAST(substr(fecha, 1, 4) AS INTEGER) % 4 = 0 AND (
          CAST(substr(fecha, 1, 4) AS INTEGER) % 100 != 0
          OR CAST(substr(fecha, 1, 4) AS INTEGER) % 400 = 0
        )
      )
      WHEN substr(fecha, 6, 2) IN ('04', '06', '09', '11') THEN 30
      ELSE 31
    END
  ),
  motivo TEXT CHECK (
    motivo IS NULL OR (
      typeof(motivo) = 'text' AND length(motivo) > 0
      -- Los caracteres de trim coinciden con String.trim() de la API.
      AND motivo = trim(motivo, char(
        9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
        8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
      ))
    )
  ),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tecnico_id, fecha)
);

-- UNIQUE ya indexa las consultas por técnico y rango de fechas.
CREATE INDEX idx_tecnico_indisponibilidades_fecha
  ON tecnico_indisponibilidades(fecha, tecnico_id);
