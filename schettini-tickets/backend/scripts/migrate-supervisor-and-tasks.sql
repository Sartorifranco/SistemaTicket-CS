-- Migración: Rol Supervisor + Módulo de Tareas
-- Ejecutar sobre la base schettini_tickets existente
-- mysql -u tickets -p schettini_tickets < scripts/migrate-supervisor-and-tasks.sql

SET NAMES utf8mb4;

-- 1. Agregar rol 'supervisor' al ENUM de Users (MySQL requiere redefinir todo el ENUM)
ALTER TABLE Users MODIFY COLUMN role ENUM('admin','supervisor','agent','client') NOT NULL DEFAULT 'client';

-- 2. Tabla de tareas asignadas a agentes/supervisores
CREATE TABLE IF NOT EXISTS agent_tasks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  assigned_to_user_id INT UNSIGNED NOT NULL,
  assigned_by_user_id INT UNSIGNED NOT NULL,
  due_date DATE NULL,
  due_time TIME NULL,
  status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_assigned_to (assigned_to_user_id),
  KEY idx_assigned_by (assigned_by_user_id),
  KEY idx_due_date (due_date),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
