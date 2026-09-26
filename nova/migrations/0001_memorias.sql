CREATE TABLE
    IF NOT EXISTS memorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        entidad TEXT,
        clave TEXT NOT NULL,
        valor TEXT NOT NULL,
        confianza REAL NOT NULL DEFAULT 1,
        importancia INTEGER NOT NULL DEFAULT 5,
        fuente TEXT NOT NULL DEFAULT 'conversacion',
        estado TEXT NOT NULL DEFAULT 'activa',
        reemplaza_id INTEGER,
        creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reemplaza_id) REFERENCES memorias (id)
    );

CREATE INDEX IF NOT EXISTS idx_memorias_tipo ON memorias (tipo);

CREATE INDEX IF NOT EXISTS idx_memorias_clave ON memorias (clave);

CREATE INDEX IF NOT EXISTS idx_memorias_estado ON memorias (estado);