-- ============================================================
-- CRM Ventas - Actualización v1.1
-- Ejecutar si ya tienes ventas_crm creada con schema.sql v1.0
-- ============================================================
USE ventas_crm;

CREATE TABLE IF NOT EXISTS comm_emails (
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

CREATE TABLE IF NOT EXISTS comm_calls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  contact_id INT DEFAULT NULL,
  direction ENUM('inbound','outbound') DEFAULT 'outbound',
  duration INT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  called_at DATETIME DEFAULT NULL,
  user_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS comm_templates (
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

CREATE TABLE IF NOT EXISTS automations (
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

-- Plantillas de email de ejemplo
INSERT IGNORE INTO comm_templates (tenant_id, name, subject, body, created_by) VALUES
(1, 'Bienvenida cliente', 'Bienvenido a nuestros servicios', 'Estimado {{nombre}},\n\nGracias por confiar en nosotros. Estamos listos para apoyarte.\n\nSaludos,\nEl equipo de ventas', 1),
(1, 'Seguimiento propuesta', 'Seguimiento de nuestra propuesta', 'Estimado {{nombre}},\n\nQuería hacer seguimiento a la propuesta que enviamos para {{empresa}}.\n\n¿Tiene alguna consulta?\n\nQuedamos a su disposición.', 1),
(1, 'Cotización enviada', 'Cotización {{numero}} adjunta', 'Estimado {{nombre}},\n\nAdjunto encontrará la cotización solicitada. El documento es válido por 30 días.\n\nPara aprobarla o realizar consultas, no dude en contactarnos.', 1);
