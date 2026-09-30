-- Migration number: 0005 	 2026-09-30T16:41:24.365Z
CREATE TABLE sesiones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_sesiones_usuario_id
ON sesiones(usuario_id);

CREATE INDEX idx_sesiones_expires_at
ON sesiones(expires_at);