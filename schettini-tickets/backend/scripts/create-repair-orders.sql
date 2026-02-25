-- Módulo: Órdenes de Reparación (Repair Orders)
-- Ejecutar: mysql -u tickets -p schettini_tickets < scripts/create-repair-orders.sql

SET NAMES utf8mb4;

-- Tabla repair_orders
CREATE TABLE IF NOT EXISTS repair_orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id INT UNSIGNED NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  entry_date TIMESTAMP NULL DEFAULT NULL,
  status ENUM(
    'ingresado',
    'cotizado',
    'aceptado',
    'no_aceptado',
    'en_espera',
    'sin_reparacion',
    'listo',
    'entregado'
  ) NOT NULL DEFAULT 'ingresado',
  equipment_type VARCHAR(255) NULL,
  model VARCHAR(255) NULL,
  serial_number VARCHAR(255) NULL,
  reported_fault TEXT NULL,
  included_accessories TEXT NULL,
  is_warranty TINYINT(1) NOT NULL DEFAULT 0,
  labor_cost DECIMAL(12,2) NULL DEFAULT NULL,
  spare_parts_cost DECIMAL(12,2) NULL DEFAULT NULL,
  total_cost DECIMAL(12,2) NULL DEFAULT NULL,
  deposit_paid DECIMAL(12,2) NULL DEFAULT NULL,
  internal_notes TEXT NULL,
  technical_report TEXT NULL,
  technician_id INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_order_number (order_number),
  KEY idx_client_id (client_id),
  KEY idx_technician_id (technician_id),
  KEY idx_status (status),
  KEY idx_entry_date (entry_date),
  CONSTRAINT fk_ro_client FOREIGN KEY (client_id) REFERENCES Users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ro_technician FOREIGN KEY (technician_id) REFERENCES Users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla repair_order_photos
CREATE TABLE IF NOT EXISTS repair_order_photos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  repair_order_id INT UNSIGNED NOT NULL,
  photo_url VARCHAR(500) NOT NULL,
  perspective_label VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_repair_order_id (repair_order_id),
  CONSTRAINT fk_rop_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
