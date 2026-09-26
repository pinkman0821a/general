CREATE TABLE
    IF NOT EXISTS entidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        nombre_base TEXT NOT NULL,
        etiqueta TEXT,
        estado TEXT NOT NULL DEFAULT 'activa',
        creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_entidades_tipo ON entidades (tipo);

CREATE INDEX IF NOT EXISTS idx_entidades_nombre_base ON entidades (nombre_base);

CREATE INDEX IF NOT EXISTS idx_entidades_estado ON entidades (estado);

ALTER TABLE memorias
ADD COLUMN entidad_id INTEGER REFERENCES entidades (id);

CREATE INDEX IF NOT EXISTS idx_memorias_entidad_id ON memorias (entidad_id);