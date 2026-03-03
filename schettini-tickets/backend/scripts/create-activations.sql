-- Módulo: Activaciones / Planillas
-- Uso: mysql -u tickets -p schettini_tickets < scripts/create-activations.sql

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS activations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id INT UNSIGNED NOT NULL,
  invoice_number VARCHAR(255) NOT NULL COMMENT 'Número de Factura/Pedido',
  form_type ENUM('fiscal', 'no_fiscal', 'controlador_fiscal', 'none') NOT NULL DEFAULT 'none',
  status ENUM('pending_validation', 'pending_client_fill', 'processing', 'ready') NOT NULL DEFAULT 'pending_validation',
  form_data JSON NULL COMMENT 'Respuestas dinámicas del formulario',
  ticket_id INT UNSIGNED NULL COMMENT 'Ticket creado al enviar el formulario',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_client_id (client_id),
  KEY idx_ticket_id (ticket_id),
  KEY idx_status (status),
  KEY idx_invoice_number (invoice_number),
  CONSTRAINT fk_activations_client FOREIGN KEY (client_id) REFERENCES Users (id) ON DELETE CASCADE,
  CONSTRAINT fk_activations_ticket FOREIGN KEY (ticket_id) REFERENCES Tickets (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
