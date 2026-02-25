-- Actualizar ENUM status en repair_orders
-- Nuevo valor: entregado_sin_reparacion
-- Los datos existentes permanecen válidos (no requieren conversión)

SET NAMES utf8mb4;

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
    'entregado_sin_reparacion'
  ) NOT NULL DEFAULT 'ingresado';
