-- Referencia privada y metadatos; la imagen vive exclusivamente en R2.
-- Sin restricción por tipo: se conserva la evidencia histórica al cambiar de tipo.
ALTER TABLE servicios ADD COLUMN comprobante_key TEXT NULL;
ALTER TABLE servicios ADD COLUMN comprobante_nombre TEXT NULL;
ALTER TABLE servicios ADD COLUMN comprobante_mime TEXT NULL
  CHECK (comprobante_mime IS NULL OR comprobante_mime IN ('image/jpeg', 'image/png', 'image/webp'));
ALTER TABLE servicios ADD COLUMN comprobante_size INTEGER NULL
  CHECK (comprobante_size IS NULL OR (typeof(comprobante_size) = 'integer' AND comprobante_size BETWEEN 1 AND 5242880));
ALTER TABLE servicios ADD COLUMN comprobante_updated_at TEXT NULL;
