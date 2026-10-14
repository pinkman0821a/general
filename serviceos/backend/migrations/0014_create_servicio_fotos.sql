CREATE TABLE servicio_fotos (
  id INTEGER PRIMARY KEY,
  servicio_id INTEGER NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  nombre_original TEXT,
  mime TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  size INTEGER NOT NULL CHECK (size > 0 AND size <= 5242880),
  orden INTEGER NOT NULL CHECK (orden >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lote TEXT NOT NULL,
  indice_lote INTEGER NOT NULL,
  UNIQUE (servicio_id, lote, indice_lote)
);
CREATE INDEX idx_servicio_fotos_orden ON servicio_fotos(servicio_id, orden, id);
CREATE TRIGGER servicio_fotos_maximo BEFORE INSERT ON servicio_fotos
WHEN (SELECT COUNT(*) FROM servicio_fotos WHERE servicio_id = NEW.servicio_id) >= 5
BEGIN
  SELECT RAISE(ABORT, 'maximo_fotos_servicio');
END;
CREATE TRIGGER servicio_fotos_maximo_actualizar BEFORE UPDATE OF servicio_id ON servicio_fotos
WHEN NEW.servicio_id != OLD.servicio_id AND (SELECT COUNT(*) FROM servicio_fotos WHERE servicio_id = NEW.servicio_id) >= 5
BEGIN
  SELECT RAISE(ABORT, 'maximo_fotos_servicio');
END;
