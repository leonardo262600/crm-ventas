-- ============================================================
-- CRM Ventas - Actualización v1.3
-- ============================================================
USE ventas_crm;

-- Columnas adicionales para price_lists
ALTER TABLE price_lists
  ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL AFTER name,
  ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'MXN' AFTER description;

-- Índice único para price_list_items (evita duplicados)
ALTER TABLE price_list_items
  ADD UNIQUE KEY IF NOT EXISTS uq_pl_product (price_list_id, product_id);
