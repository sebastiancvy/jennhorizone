
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  enfermedad TEXT,
  cita TEXT,
  observaciones TEXT,
  imagenes TEXT, -- JSON array of URLs
  videos TEXT,   -- JSON array of URLs
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP
);
