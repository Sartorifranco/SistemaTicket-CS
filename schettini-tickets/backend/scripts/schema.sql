-- Schema inicial para Sistema de Tickets - MySQL 8
-- Uso: mysql -u tickets -p schettini_tickets < scripts/schema.sql
-- O desde MySQL Workbench: ejecutar este archivo sobre la base schettini_tickets

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Tabla de empresas (Companies - mismo nombre que en el código)
CREATE TABLE IF NOT EXISTS Companies (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de departamentos (Departments)
CREATE TABLE IF NOT EXISTS Departments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  company_id INT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de usuarios (Users)
CREATE TABLE IF NOT EXISTS Users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','agent','client') NOT NULL DEFAULT 'client',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  phone VARCHAR(50),
  cuit VARCHAR(50),
  business_name VARCHAR(255),
  fantasy_name VARCHAR(255),
  company_id INT UNSIGNED NULL,
  department_id INT UNSIGNED NULL,
  plan VARCHAR(50) DEFAULT 'Free',
  plan_expiry DATE NULL,
  price DECIMAL(10,2) NULL,
  last_login DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_email (email),
  KEY idx_username (username),
  KEY idx_role (role),
  KEY idx_company (company_id),
  KEY idx_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de tickets (Tickets)
CREATE TABLE IF NOT EXISTS Tickets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  assigned_to_user_id INT UNSIGNED NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) DEFAULT 'open',
  department_id INT UNSIGNED NULL,
  category_id INT UNSIGNED NULL,
  closure_reason VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  KEY idx_assigned (assigned_to_user_id),
  KEY idx_department (department_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentarios de tickets
CREATE TABLE IF NOT EXISTS comments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  comment_text TEXT NOT NULL,
  is_internal TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ticket (ticket_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adjuntos de tickets
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id INT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  PRIMARY KEY (id),
  KEY idx_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(50),
  message TEXT,
  related_id INT UNSIGNED NULL,
  related_type VARCHAR(50) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log de actividad
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  user_username VARCHAR(100) NULL,
  user_role VARCHAR(20) NULL,
  activity_type VARCHAR(50) NULL,
  action_type VARCHAR(50) NULL,
  description TEXT,
  target_type VARCHAR(50) NULL,
  target_id INT UNSIGNED NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notas de agente
CREATE TABLE IF NOT EXISTS agent_notes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Planes
CREATE TABLE IF NOT EXISTS plans (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(30),
  price DECIMAL(10,2) DEFAULT 0,
  features TEXT,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Módulos
CREATE TABLE IF NOT EXISTS modules (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categorías de tickets (por empresa o global)
CREATE TABLE IF NOT EXISTS ticket_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  company_id INT UNSIGNED NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Problemas predefinidos
CREATE TABLE IF NOT EXISTS predefined_problems (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  category_id INT UNSIGNED NULL,
  department_id INT UNSIGNED NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pagos
CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  receipt_url VARCHAR(500),
  description TEXT,
  status VARCHAR(30) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos de facturación
CREATE TABLE IF NOT EXISTS billing_details (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  tax_id VARCHAR(50),
  business_name VARCHAR(255),
  address TEXT,
  fiscal_condition VARCHAR(100),
  email_invoice VARCHAR(255),
  PRIMARY KEY (id),
  UNIQUE KEY uk_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Base de conocimiento
CREATE TABLE IF NOT EXISTS knowledge_base (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  content LONGTEXT,
  category VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Promociones
CREATE TABLE IF NOT EXISTS promotions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  type VARCHAR(50) DEFAULT 'offer',
  active TINYINT(1) DEFAULT 1,
  is_popup TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Intereses en promociones
CREATE TABLE IF NOT EXISTS promotion_interests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  promotion_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_promo_user (promotion_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuración de tickets (sistemas, equipos, categorías, problemas)
CREATE TABLE IF NOT EXISTS ticket_systems (id INT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(255), PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS ticket_equipment (id INT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(255), PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS problem_categories (id INT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(255), category_id INT UNSIGNED NULL, PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS specific_problems (id INT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(255), category_id INT UNSIGNED NULL, PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Feedback de tickets
CREATE TABLE IF NOT EXISTS ticket_feedback (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  rating INT,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mensajes de soporte/chat
CREATE TABLE IF NOT EXISTS support_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  sender_role VARCHAR(20),
  message TEXT,
  is_read TINYINT(1) DEFAULT 0,
  is_archived TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ubicaciones (opcional)
CREATE TABLE IF NOT EXISTS locations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255),
  type VARCHAR(50),
  company_id INT UNSIGNED NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuración del sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  PRIMARY KEY (id),
  UNIQUE KEY uk_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
