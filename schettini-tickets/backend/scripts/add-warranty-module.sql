-- Módulo de Garantías en Órdenes de Taller (repair_orders)
-- Ejecutar: mysql -u root -p schettini_tickets < scripts/add-warranty-module.sql
-- O: node scripts/run-warranty-migration.js

SET NAMES utf8mb4;

-- 1) Nuevas columnas en repair_orders (ejecutar con run-warranty-migration.js para idempotencia)
ALTER TABLE repair_orders ADD COLUMN is_warranty TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE repair_orders ADD COLUMN warranty_type VARCHAR(50) NULL;
ALTER TABLE repair_orders ADD COLUMN purchase_invoice_number VARCHAR(255) NULL;
ALTER TABLE repair_orders ADD COLUMN purchase_date DATE NULL;
ALTER TABLE repair_orders ADD COLUMN original_supplier VARCHAR(255) NULL;
ALTER TABLE repair_orders ADD COLUMN requires_factory_shipping TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE repair_orders ADD COLUMN warranty_status VARCHAR(50) NULL;

-- Índices para filtros de garantías (ignorar si ya existen)
-- ALTER TABLE repair_orders ADD INDEX idx_is_warranty (is_warranty);
-- ALTER TABLE repair_orders ADD INDEX idx_warranty_status (warranty_status);
-- ALTER TABLE repair_orders ADD INDEX idx_original_supplier (original_supplier(100));

-- 2) Tabla de historial de cambios de estado (orden y warranty_status)
CREATE TABLE IF NOT EXISTS repair_order_status_history (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  repair_order_id INT UNSIGNED NOT NULL,
  field_changed VARCHAR(50) NOT NULL COMMENT 'status, warranty_status',
  old_value VARCHAR(100) NULL,
  new_value VARCHAR(100) NULL,
  changed_by INT UNSIGNED NULL COMMENT 'user id que realizó el cambio',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_repair_order_id (repair_order_id),
  KEY idx_created_at (created_at),
  CONSTRAINT fk_rosh_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_rosh_user FOREIGN KEY (changed_by) REFERENCES Users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
