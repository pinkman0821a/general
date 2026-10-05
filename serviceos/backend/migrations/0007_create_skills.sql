CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL COLLATE NOCASE UNIQUE
    CHECK (length(trim(nombre)) > 0 AND nombre = trim(nombre)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tecnico_skills (
  tecnico_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tecnico_id, skill_id),
  FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX idx_tecnico_skills_skill_id ON tecnico_skills(skill_id);
