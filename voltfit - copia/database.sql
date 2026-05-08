-- ============================================================
-- VOLTFIT – JA Infinity
-- Esquema SQL para Supabase PostgreSQL
-- ============================================================

-- ============================================================
-- 1. TABLA: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(150)  NOT NULL,
  categoria    VARCHAR(50)   NOT NULL,
  descripcion  TEXT,
  activo       BOOLEAN       DEFAULT TRUE,
  created_at   TIMESTAMPTZ   DEFAULT NOW(),

  -- Validación de categorías permitidas
  CONSTRAINT chk_categoria CHECK (
    categoria IN ('Hombre', 'Mujer', 'Gym', 'Running', 'Casual Sport')
  )
);

-- Índice para filtrar por categoría rápidamente
CREATE INDEX IF NOT EXISTS idx_products_categoria ON products (categoria);
CREATE INDEX IF NOT EXISTS idx_products_activo    ON products (activo);

-- ============================================================
-- 2. TABLA: leads
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo    VARCHAR(200)  NOT NULL,
  correo             VARCHAR(254)  NOT NULL,
  telefono           VARCHAR(20),
  ubicacion          VARCHAR(100),
  tipo_cliente       VARCHAR(20)   NOT NULL,
  nivel_interes      VARCHAR(10)   NOT NULL,
  prioridad          SMALLINT      NOT NULL DEFAULT 0,
  producto_id        UUID          REFERENCES products(id) ON DELETE SET NULL,
  acepta_privacidad  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ   DEFAULT NOW(),

  -- Validaciones
  CONSTRAINT chk_tipo_cliente   CHECK (tipo_cliente   IN ('personal', 'empresa')),
  CONSTRAINT chk_nivel_interes  CHECK (nivel_interes  IN ('bajo', 'medio', 'alto')),
  CONSTRAINT chk_prioridad      CHECK (prioridad      BETWEEN 0 AND 3),
  CONSTRAINT chk_privacidad     CHECK (acepta_privacidad = TRUE)
);

-- Índices útiles para reportes y filtros
CREATE INDEX IF NOT EXISTS idx_leads_prioridad    ON leads (prioridad DESC);
CREATE INDEX IF NOT EXISTS idx_leads_correo       ON leads (correo);
CREATE INDEX IF NOT EXISTS idx_leads_producto_id  ON leads (producto_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at   ON leads (created_at DESC);

-- ============================================================
-- 3. DATOS INICIALES (SEED) – Productos VoltFit
-- ============================================================

INSERT INTO products (nombre, categoria, descripcion, imagen_url, activo) VALUES

-- HOMBRE
(
  'Playera Deportiva Pro',
  'Hombre',
  'Playera de alto rendimiento con tecnología de absorción de humedad. Tejido transpirable ideal para entrenamientos intensos en el gimnasio o actividades al aire libre.',

  TRUE
),
(
  'Shorts Running Aero',
  'Hombre',
  'Shorts ligeros con bolsillo lateral y cintura ajustable. Diseñados para maximizar la movilidad en carreras y sesiones de cardio.',
  
  TRUE
),
(
  'Pants Casual Sport',
  'Hombre',
  'Pants versátiles con diseño moderno. Perfecto para el gym, salidas casuales o días de descanso activo. Tela suave y resistente.',
  TRUE
),

-- MUJER
(
  'Leggings Flex Ultra',
  'Mujer',
  'Leggings de compresión con tela de cuatro vías de elasticidad. Soporte muscular óptimo para yoga, crossfit y entrenamiento funcional.',
  TRUE
),
(
  'Top Deportivo Volt',
  'Mujer',
  'Top con soporte medio, diseño cruzado en espalda y tela sin costuras. Comodidad y estilo para cualquier actividad física.',
  TRUE
),
(
  'Conjunto Deportivo Femenino',
  'Mujer',
  'Set completo top + leggings coordinados. Tela premium con tecnología anti-transparencia y acabado mate deportivo.',
  TRUE
),

-- GYM
(
  'Sudadera Gym Core',
  'Gym',
  'Sudadera con capucha y bolsillo canguro. Tela gruesa de felpa interior para días fríos en el gym. Corte moderno y ajustado.',
  TRUE
),
(
  'Conjunto Gym Power',
  'Gym',
  'Conjunto completo para entrenamiento intenso. Playera + shorts coordinados con tela de secado rápido y mayor rango de movimiento.',
  TRUE
),

-- RUNNING
(
  'Playera Running Wind',
  'Running',
  'Playera ultraligera con reflectivos para visibilidad nocturna. Aerodinámica y transpirable para carreras largas y competencias.',
  TRUE
),
(
  'Shorts Running Elite',
  'Running',
  'Shorts de compresión interior con capa exterior ligera. Diseño aerodinámico y bolsillo seguro para llaves o celular.',
  TRUE
),

-- CASUAL SPORT
(
  'Pants Casual Volt',
  'Casual Sport',
  'Pants de algodón premium con detalles en verde eléctrico. El equilibrio perfecto entre comodidad casual y estilo deportivo urbano.',
  TRUE
),
(
  'Sudadera Casual Street',
  'Casual Sport',
  'Sudadera oversized con gráfico VoltFit bordado. Para el gym, la calle o el home office. Estilo urbano-deportivo en su máxima expresión.',
  TRUE
);

-- ============================================================
-- 4. VISTA ÚTIL: leads con nombre de producto
-- ============================================================
CREATE OR REPLACE VIEW vw_leads_detalle AS
SELECT
  l.id,
  l.nombre_completo,
  l.correo,
  l.telefono,
  l.ubicacion,
  l.tipo_cliente,
  l.nivel_interes,
  l.prioridad,
  p.nombre       AS producto_nombre,
  p.categoria    AS producto_categoria,
  l.acepta_privacidad,
  l.created_at
FROM leads l
LEFT JOIN products p ON l.producto_id = p.id
ORDER BY l.prioridad DESC, l.created_at DESC;

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
