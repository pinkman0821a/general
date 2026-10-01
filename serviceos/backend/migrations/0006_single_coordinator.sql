CREATE UNIQUE INDEX idx_usuarios_unico_coordinador
ON usuarios (rol)
WHERE rol = 'coordinador';