-- Opciones frecuentes independientes del historial de cada recepción. Sin datos iniciales.
CREATE TABLE taller_catalogo_accesorios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (
    typeof(nombre) = 'text' AND length(nombre) > 0
    AND nombre = trim(nombre, char(
      9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195,
      8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279
    ))
  ),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
