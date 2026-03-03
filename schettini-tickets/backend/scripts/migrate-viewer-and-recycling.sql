-- 1) Rol Vista: agregar 'viewer' al ENUM role en Users
-- 2) Área de Reciclaje: agregar recycling_notes y recycling_photos a repair_orders
-- 3) Asegurar que status en repair_orders incluya 'abandonado'
-- Uso: mysql -u tickets -p schettini_tickets < scripts/migrate-viewer-and-recycling.sql

SET NAMES utf8mb4;

-- Users: agregar rol 'viewer'
ALTER TABLE Users
  MODIFY COLUMN role ENUM('admin','supervisor','agent','viewer','client') NOT NULL DEFAULT 'client';

-- repair_orders: agregar columnas de reciclaje (ejecutar una vez; si ya existen, ignorar error)
ALTER TABLE repair_orders ADD COLUMN recycling_notes TEXT NULL COMMENT 'Observaciones internas de reciclaje';
ALTER TABLE repair_orders ADD COLUMN recycling_photos JSON NULL COMMENT 'URLs de fotos del estado del equipo al reciclar';

-- repair_orders: asegurar que status incluya 'abandonado' (si no está en el ENUM actual)
ALTER TABLE repair_orders
  MODIFY COLUMN status ENUM(
    'ingresado',
    'cotizado',
    'aceptado',
    'no_aceptado',
    'en_espera',
    'sin_reparacion',
    'listo',
    'entregado',
    'entregado_sin_reparacion',
    'abandonado'
  ) NOT NULL DEFAULT 'ingresado';
