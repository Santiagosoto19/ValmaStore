-- Agrega estado activo/inactivo a marcas
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
