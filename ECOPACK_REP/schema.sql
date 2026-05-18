-- ============================================================
-- schema.sql — Ecopack
-- Base de datos PostgreSQL / Supabase
-- ============================================================

-- ── 1. Tabla: productos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id     SERIAL PRIMARY KEY,
  nombre TEXT   NOT NULL
);

-- Datos maestros de productos (IDs fijos, usados como FK)
INSERT INTO productos (id, nombre) VALUES
  (1, 'Empaques reciclados'),
  (2, 'Cajas de cartón'),
  (3, 'Cubiertos reciclados'),
  (4, 'Bolsas de papel'),
  (5, 'Envases biodegradables para alimentos')
ON CONFLICT (id) DO NOTHING;  -- Idempotente: no falla si ya existen

-- Reseteamos la secuencia para que el próximo SERIAL no colisione
SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));

-- ── 2. Tabla: leads ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id           SERIAL  PRIMARY KEY,

  -- Datos de contacto
  nombre       TEXT    NOT NULL,
  correo       TEXT    NOT NULL,
  telefono     TEXT    NOT NULL,

  -- Clasificación del lead
  producto_id  INTEGER NOT NULL,
  tipo_persona TEXT    NOT NULL CHECK (tipo_persona IN ('individual', 'negocio', 'empresa')),
  plazo        TEXT    NOT NULL CHECK (plazo        IN ('interes', 'medio', 'corto', 'urgente')),

  -- Puntuación calculada en frontend (0=visitante, 1=baja, 2=media, 3=alta)
  prioridad    INTEGER NOT NULL CHECK (prioridad BETWEEN 0 AND 3),

  -- Timestamp automático
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Integridad referencial con productos
  CONSTRAINT fk_producto
    FOREIGN KEY (producto_id)
    REFERENCES productos (id)
    ON DELETE CASCADE
);

-- ── 3. Índices útiles para consultas frecuentes ────────────────

-- Buscar leads por prioridad (para tablero de ventas)
CREATE INDEX IF NOT EXISTS idx_leads_prioridad
  ON leads (prioridad DESC, created_at DESC);

-- Filtrar leads por producto
CREATE INDEX IF NOT EXISTS idx_leads_producto
  ON leads (producto_id);

-- Filtrar leads por tipo de persona
CREATE INDEX IF NOT EXISTS idx_leads_tipo_persona
  ON leads (tipo_persona);

-- Filtrar leads por correo (evitar duplicados, búsqueda rápida)
CREATE INDEX IF NOT EXISTS idx_leads_correo
  ON leads (correo);

-- ── 4. Row Level Security (RLS) para Supabase ─────────────────
-- Habilita RLS en ambas tablas

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads     ENABLE ROW LEVEL SECURITY;

-- Política: cualquiera puede leer productos (catálogo público)
CREATE POLICY "productos_public_read"
  ON productos
  FOR SELECT
  USING (true);

-- Política: cualquiera puede insertar un lead (formulario público)
CREATE POLICY "leads_public_insert"
  ON leads
  FOR INSERT
  WITH CHECK (true);

-- Política: solo usuarios autenticados pueden leer/gestionar leads
CREATE POLICY "leads_auth_read"
  ON leads
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── 5. Vista auxiliar: leads con nombre de producto ───────────
-- Útil para dashboards o reportes sin hacer JOIN manual
CREATE OR REPLACE VIEW v_leads_detalle AS
SELECT
  l.id,
  l.nombre,
  l.correo,
  l.telefono,
  p.nombre          AS producto,
  l.producto_id,
  l.tipo_persona,
  l.plazo,
  l.prioridad,
  CASE l.prioridad
    WHEN 0 THEN 'Visitante'
    WHEN 1 THEN 'Baja'
    WHEN 2 THEN 'Media'
    WHEN 3 THEN 'Alta'
    ELSE 'Desconocida'
  END               AS prioridad_label,
  l.created_at
FROM leads l
JOIN productos p ON p.id = l.producto_id
ORDER BY l.prioridad DESC, l.created_at DESC;
