CREATE TABLE app_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_info (
  nombre,
  version
)
VALUES (
  'ServiceOS',
  '0.07'
);