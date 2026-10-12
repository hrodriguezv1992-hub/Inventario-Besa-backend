-- ============================================================
-- INVENTAPRO - Schema PostgreSQL
-- ============================================================

-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'operador' CHECK (rol IN ('admin', 'operador', 'supervisor')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productos / catálogo
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  tipo VARCHAR(50),
  empaque INTEGER DEFAULT 0,
  cajas_tarima INTEGER DEFAULT 0,
  mililitros INTEGER DEFAULT 0,
  min_paquetes INTEGER DEFAULT 0,
  solo_tarima BOOLEAN DEFAULT false,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Días de inventario (uno por fecha)
CREATE TABLE IF NOT EXISTS dias (
  id SERIAL PRIMARY KEY,
  fecha DATE UNIQUE NOT NULL,
  cerrado BOOLEAN DEFAULT false,
  es_inhabil BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock inicial por día por producto
CREATE TABLE IF NOT EXISTS stock_inicial (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  sku VARCHAR(20) NOT NULL,
  cantidad NUMERIC(10,2) DEFAULT 0,
  UNIQUE(fecha, sku)
);

-- Conteos físicos
CREATE TABLE IF NOT EXISTS conteos (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  sku VARCHAR(20) NOT NULL,
  cantidad NUMERIC(10,2) DEFAULT 0,
  confirmado BOOLEAN DEFAULT false,
  fecha_confirmacion TIMESTAMPTZ,
  usuario_id INTEGER REFERENCES usuarios(id),
  UNIQUE(fecha, sku)
);

-- Movimientos (compras, ventas, cargas, devoluciones, mermas, no_cargado)
CREATE TABLE IF NOT EXISTS movimientos (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('compra','venta','carga','devolucion','merma','no_cargado')),
  sku VARCHAR(20) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 0,
  folio VARCHAR(100),
  grupo_importacion VARCHAR(100),
  costo NUMERIC(10,4),
  confirmado BOOLEAN DEFAULT false,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pendiente Liquidar (lista permanente)
CREATE TABLE IF NOT EXISTS pte_liquidar (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(20) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 0,
  motivo VARCHAR(200),
  fecha_alta DATE NOT NULL,
  liquidado BOOLEAN DEFAULT false,
  fecha_liquidacion DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshot de Pte. Liquidar al cierre del día
CREATE TABLE IF NOT EXISTS pte_liquidar_snapshot (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  sku VARCHAR(20) NOT NULL,
  cantidad NUMERIC(10,2) DEFAULT 0,
  UNIQUE(fecha, sku)
);

-- Lista de precios de compra
CREATE TABLE IF NOT EXISTS lista_precios_compra (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(20) NOT NULL,
  costo NUMERIC(10,4) NOT NULL DEFAULT 0,
  fecha_vigencia DATE NOT NULL DEFAULT CURRENT_DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lista de precios de venta
CREATE TABLE IF NOT EXISTS lista_precios_venta (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(20) NOT NULL,
  precio NUMERIC(10,4) NOT NULL DEFAULT 0,
  tasa_iva NUMERIC(5,4) DEFAULT 0.16,
  fecha_vigencia DATE NOT NULL DEFAULT CURRENT_DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Órdenes de compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
  id SERIAL PRIMARY KEY,
  folio VARCHAR(50) UNIQUE NOT NULL,
  trailer_label VARCHAR(100),
  fecha DATE NOT NULL,
  hora TIME,
  estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','Recibida')),
  notas TEXT,
  total_tarimas NUMERIC(10,2) DEFAULT 0,
  total_paquetes NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items de órdenes de compra
CREATE TABLE IF NOT EXISTS ordenes_compra_items (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  sku VARCHAR(20) NOT NULL,
  nombre VARCHAR(200),
  tarimas NUMERIC(10,2) DEFAULT 0,
  paquetes NUMERIC(10,2) DEFAULT 0,
  dias_existencia NUMERIC(10,2),
  cajas_tarima INTEGER DEFAULT 0
);

-- Equivalencias XML (mapeo nombre XML → SKU)
CREATE TABLE IF NOT EXISTS equivalencias (
  id SERIAL PRIMARY KEY,
  nombre_xml VARCHAR(300) UNIQUE NOT NULL,
  sku VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de acciones
CREATE TABLE IF NOT EXISTS log_acciones (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  usuario VARCHAR(100),
  accion TEXT NOT NULL,
  detalle TEXT,
  modulo VARCHAR(50)
);

-- ============================================================
-- Índices para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_sku ON movimientos(sku);
CREATE INDEX IF NOT EXISTS idx_conteos_fecha ON conteos(fecha);
CREATE INDEX IF NOT EXISTS idx_stock_inicial_fecha ON stock_inicial(fecha);
CREATE INDEX IF NOT EXISTS idx_pte_liquidar_sku ON pte_liquidar(sku);
CREATE INDEX IF NOT EXISTS idx_pte_liquidar_liquidado ON pte_liquidar(liquidado);

-- ============================================================
-- Usuario admin por defecto
-- ============================================================
INSERT INTO usuarios (nombre, usuario, password_hash, rol)
VALUES ('Administrador', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (usuario) DO NOTHING;
-- Password por defecto: "password" (cambiar inmediatamente)
