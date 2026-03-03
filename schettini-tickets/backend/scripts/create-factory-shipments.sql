-- Módulo: Equipos en Fábrica (Seguimiento de stock externo)
-- Ejecutar: mysql -u tickets -p schettini_tickets < scripts/create-factory-shipments.sql

SET NAMES utf8mb4;

-- Tabla equipment_inventory (inventario de equipos para lógica de stock)
CREATE TABLE IF NOT EXISTS equipment_inventory (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  serial_number VARCHAR(255) NOT NULL,
  brand VARCHAR(255) NULL,
  model VARCHAR(255) NULL,
  status VARCHAR(50) DEFAULT 'disponible',
  location VARCHAR(100) NULL COMMENT 'ej: Almacén, Stock en fábrica',
  available_for_sale TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_serial (serial_number),
  KEY idx_available (available_for_sale),
  KEY idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla factory_shipments (envíos a fábrica)
CREATE TABLE IF NOT EXISTS factory_shipments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  send_date DATETIME NOT NULL,
  send_type ENUM('garantia', 'reparacion', 'cambio', 'evaluacion_tecnica') NOT NULL,
  destination_company VARCHAR(255) NULL,
  tracking_number VARCHAR(255) NULL,
  transport VARCHAR(255) NULL,
  brand VARCHAR(255) NULL,
  model VARCHAR(255) NULL,
  serial_number VARCHAR(255) NULL,
  reason TEXT NULL,
  linked_order_id INT UNSIGNED NULL,
  estimated_value DECIMAL(10,2) NULL,
  authorized_by INT UNSIGNED NULL,
  status ENUM(
    'en_transito',
    'recibido_fabrica',
    'en_diagnostico',
    'aprobado_cambio',
    'reparado',
    'en_retorno',
    'recibido_empresa',
    'cerrado'
  ) NOT NULL DEFAULT 'en_transito',
  return_date DATETIME NULL,
  final_result ENUM('reparado', 'cambio_nuevo', 'nota_credito', 'rechazado') NULL,
  internal_observations TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_send_date (send_date),
  KEY idx_status (status),
  KEY idx_destination (destination_company(100)),
  KEY idx_serial (serial_number),
  CONSTRAINT fk_fs_order FOREIGN KEY (linked_order_id) REFERENCES repair_orders (id) ON DELETE SET NULL,
  CONSTRAINT fk_fs_authorized FOREIGN KEY (authorized_by) REFERENCES Users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
