-- Ajustes finales al módulo Órdenes de Reparación
-- Ejecutar: node scripts/run-alter-repair-orders.js
-- O manualmente: mysql -u root -p schettini_tickets < scripts/alter-repair-orders-fields.sql

SET NAMES utf8mb4;

ALTER TABLE repair_orders
  ADD COLUMN accepted_date DATE NULL AFTER technician_id,
  ADD COLUMN promised_date DATE NULL AFTER accepted_date,
  ADD COLUMN delivered_date DATE NULL AFTER promised_date,
  ADD COLUMN warranty_expiration_date DATE NULL AFTER delivered_date,
  ADD COLUMN public_notes TEXT NULL AFTER warranty_expiration_date,
  ADD COLUMN spare_parts_detail TEXT NULL AFTER public_notes;
