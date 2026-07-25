-- ============================================================
-- CRM Ventas - Base de datos: ventas_crm
-- ============================================================

CREATE DATABASE IF NOT EXISTS ventas_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ventas_crm;

-- -------------------------------------------------------
-- Tenants (multitenancy)
-- -------------------------------------------------------
CREATE TABLE tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- Usuarios
-- -------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','gerente','vendedor') NOT NULL DEFAULT 'vendedor',
  avatar VARCHAR(255) DEFAULT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- -------------------------------------------------------
-- Contactos / Clientes
-- -------------------------------------------------------
CREATE TABLE contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  company VARCHAR(150) DEFAULT NULL,
  position VARCHAR(100) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  tags VARCHAR(500) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- Etapas del pipeline
-- -------------------------------------------------------
CREATE TABLE pipeline_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#3B82F6',
  order_index INT DEFAULT 0,
  is_default TINYINT(1) DEFAULT 0,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- -------------------------------------------------------
-- Oportunidades
-- -------------------------------------------------------
CREATE TABLE opportunities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  title VARCHAR(200) NOT NULL,
  contact_id INT DEFAULT NULL,
  stage_id INT DEFAULT NULL,
  amount DECIMAL(15,2) DEFAULT 0,
  probability INT DEFAULT 0,
  close_date DATE DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  status ENUM('open','won','lost') DEFAULT 'open',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- Actividades
-- -------------------------------------------------------
CREATE TABLE activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  title VARCHAR(200) NOT NULL,
  type ENUM('tarea','reunion','llamada','email','recordatorio') DEFAULT 'tarea',
  description TEXT DEFAULT NULL,
  scheduled_at DATETIME DEFAULT NULL,
  due_at DATETIME DEFAULT NULL,
  status ENUM('pendiente','completada','cancelada') DEFAULT 'pendiente',
  contact_id INT DEFAULT NULL,
  opportunity_id INT DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- Productos / Catálogo
-- -------------------------------------------------------
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  sku VARCHAR(100) DEFAULT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  category VARCHAR(100) DEFAULT NULL,
  price DECIMAL(15,2) DEFAULT 0,
  cost DECIMAL(15,2) DEFAULT 0,
  stock INT DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'unidad',
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- -------------------------------------------------------
-- Listas de precios
-- -------------------------------------------------------
CREATE TABLE price_lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(150) NOT NULL,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- -------------------------------------------------------
-- Cotizaciones
-- -------------------------------------------------------
CREATE TABLE quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  number VARCHAR(50) NOT NULL,
  contact_id INT DEFAULT NULL,
  opportunity_id INT DEFAULT NULL,
  status ENUM('borrador','enviada','aprobada','rechazada','convertida') DEFAULT 'borrador',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  notes TEXT DEFAULT NULL,
  valid_until DATE DEFAULT NULL,
  created_by INT DEFAULT NULL,
  approved_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- Ítems de cotización
-- -------------------------------------------------------
CREATE TABLE quote_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  description VARCHAR(300) DEFAULT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(15,2) DEFAULT 0,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- -------------------------------------------------------
-- Comunicaciones: Emails
-- -------------------------------------------------------
CREATE TABLE comm_emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  contact_id INT DEFAULT NULL,
  subject VARCHAR(300) NOT NULL,
  body TEXT DEFAULT NULL,
  user_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- Comunicaciones: Llamadas
-- -------------------------------------------------------
CREATE TABLE comm_calls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  contact_id INT DEFAULT NULL,
  direction ENUM('inbound','outbound') DEFAULT 'outbound',
  duration INT DEFAULT NULL COMMENT 'minutos',
  notes TEXT DEFAULT NULL,
  called_at DATETIME DEFAULT NULL,
  user_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- Comunicaciones: Plantillas
-- -------------------------------------------------------
CREATE TABLE comm_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(150) NOT NULL,
  subject VARCHAR(300) DEFAULT NULL,
  body TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- Automatizaciones: Workflows
-- -------------------------------------------------------
CREATE TABLE automations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(200) NOT NULL,
  trigger_type ENUM('opportunity_created','opportunity_stage_changed','contact_created','activity_due','quote_approved') NOT NULL,
  trigger_config JSON DEFAULT NULL,
  action_type ENUM('create_activity','send_email','assign_user','change_stage') NOT NULL,
  action_config JSON DEFAULT NULL,
  active TINYINT(1) DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- Log de auditoría
-- -------------------------------------------------------
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT DEFAULT 1,
  user_id INT DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) DEFAULT NULL,
  record_id INT DEFAULT NULL,
  details JSON DEFAULT NULL,
  ip VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- Datos iniciales (seed)
-- ============================================================
INSERT INTO tenants (name) VALUES ('Mi Empresa CRM');

INSERT INTO pipeline_stages (tenant_id, name, color, order_index, is_default) VALUES
(1, 'Prospecto',    '#6B7280', 1, 1),
(1, 'Calificado',   '#3B82F6', 2, 0),
(1, 'Propuesta',    '#F59E0B', 3, 0),
(1, 'Negociación',  '#8B5CF6', 4, 0),
(1, 'Cerrado Ganado', '#10B981', 5, 0),
(1, 'Cerrado Perdido', '#EF4444', 6, 0);

-- Usuario administrador por defecto  (password: admin123)
INSERT INTO users (tenant_id, name, email, password, role) VALUES
(1, 'Administrador', 'admin@crm.com', '$2a$10$nAapQ3hcdOzSgGTuQWxw5.ojY81rTR8GuAz/KrLXgDoblHogN20Je', 'admin');

-- Productos de ejemplo
INSERT INTO products (tenant_id, sku, name, category, price, stock) VALUES
(1, 'PROD-001', 'Servicio Consultoría', 'Servicios', 1500.00, 999),
(1, 'PROD-002', 'Licencia Software Anual', 'Software', 3600.00, 999),
(1, 'PROD-003', 'Soporte Premium', 'Soporte', 800.00, 999),
(1, 'PROD-004', 'Capacitación Presencial', 'Formación', 2000.00, 50),
(1, 'PROD-005', 'Implementación', 'Servicios', 5000.00, 999);
