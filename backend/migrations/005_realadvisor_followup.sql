-- CRM personal RealAdvisor: datos de demo, objeciones y seguimiento.
-- Ejecutar una sola vez sobre la base de datos actual.

ALTER TABLE opportunities
  ADD COLUMN client_type ENUM('agente','agencia','red') DEFAULT 'agencia',
  ADD COLUMN zone VARCHAR(200) DEFAULT NULL,
  ADD COLUMN city VARCHAR(120) DEFAULT NULL,
  ADD COLUMN province VARCHAR(120) DEFAULT NULL,
  ADD COLUMN offices_count INT DEFAULT NULL,
  ADD COLUMN agents_count INT DEFAULT NULL,
  ADD COLUMN lead_source VARCHAR(120) DEFAULT NULL,
  ADD COLUMN demo_date DATETIME DEFAULT NULL,
  ADD COLUMN temperature ENUM('caliente','templada','fria') DEFAULT 'templada',
  ADD COLUMN monthly_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN proposal_period VARCHAR(100) DEFAULT NULL,
  ADD COLUMN current_solution VARCHAR(200) DEFAULT NULL,
  ADD COLUMN decision_maker VARCHAR(150) DEFAULT NULL,
  ADD COLUMN stakeholders VARCHAR(500) DEFAULT NULL,
  ADD COLUMN main_goal TEXT DEFAULT NULL,
  ADD COLUMN current_problem TEXT DEFAULT NULL,
  ADD COLUMN problem_impact TEXT DEFAULT NULL,
  ADD COLUMN current_acquisition TEXT DEFAULT NULL,
  ADD COLUMN current_captures INT DEFAULT NULL,
  ADD COLUMN target_captures INT DEFAULT NULL,
  ADD COLUMN urgency VARCHAR(100) DEFAULT NULL,
  ADD COLUMN urgency_reason TEXT DEFAULT NULL,
  ADD COLUMN decision_criteria TEXT DEFAULT NULL,
  ADD COLUMN client_quote TEXT DEFAULT NULL,
  ADD COLUMN objection_type VARCHAR(100) DEFAULT NULL,
  ADD COLUMN objection_detail TEXT DEFAULT NULL,
  ADD COLUMN objection_response TEXT DEFAULT NULL,
  ADD COLUMN objection_status ENUM('pendiente','respondida','resuelta','no_resuelta') DEFAULT 'pendiente',
  ADD COLUMN last_interaction_at DATETIME DEFAULT NULL,
  ADD COLUMN last_interaction_channel VARCHAR(50) DEFAULT NULL,
  ADD COLUMN next_action VARCHAR(200) DEFAULT NULL,
  ADD COLUMN next_action_type VARCHAR(50) DEFAULT NULL,
  ADD COLUMN next_action_at DATETIME DEFAULT NULL,
  ADD COLUMN followup_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN latest_response TEXT DEFAULT NULL,
  ADD COLUMN decision_date DATE DEFAULT NULL,
  ADD COLUMN resume_date DATE DEFAULT NULL,
  ADD COLUMN lost_reason VARCHAR(120) DEFAULT NULL,
  ADD COLUMN lost_detail TEXT DEFAULT NULL,
  ADD COLUMN competitor_chosen VARCHAR(150) DEFAULT NULL,
  ADD COLUMN activation_date DATE DEFAULT NULL,
  ADD COLUMN stage_entered_at DATETIME DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE activities
  MODIFY COLUMN type ENUM('tarea','reunion','llamada','email','whatsapp','videollamada','recordatorio','nota') DEFAULT 'tarea',
  ADD COLUMN outcome VARCHAR(200) DEFAULT NULL,
  ADD COLUMN contacted TINYINT(1) DEFAULT NULL;

CREATE INDEX idx_opportunities_followup
  ON opportunities (tenant_id, status, next_action_at);

CREATE INDEX idx_opportunities_temperature
  ON opportunities (tenant_id, temperature);

-- Reemplaza las etapas solo para tenants que todavía conservan las etapas
-- de demostración. Las oportunidades existentes mantienen su relación.
SET @tenant := 1;

UPDATE pipeline_stages SET name='Nuevo contacto', color='#64748B', order_index=1
WHERE tenant_id=@tenant AND order_index=1;
UPDATE pipeline_stages SET name='Contactado', color='#3B82F6', order_index=2
WHERE tenant_id=@tenant AND order_index=2;
UPDATE pipeline_stages SET name='Demo agendada', color='#06B6D4', order_index=3
WHERE tenant_id=@tenant AND order_index=3;
UPDATE pipeline_stages SET name='Demo realizada', color='#8B5CF6', order_index=4
WHERE tenant_id=@tenant AND order_index=4;
UPDATE pipeline_stages SET name='Propuesta enviada', color='#F59E0B', order_index=5
WHERE tenant_id=@tenant AND order_index=5;
UPDATE pipeline_stages SET name='En seguimiento', color='#F97316', order_index=6
WHERE tenant_id=@tenant AND order_index=6;

INSERT INTO pipeline_stages (tenant_id, name, color, order_index, is_default)
SELECT @tenant, 'Decisión pendiente', '#EAB308', 7, 0
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE tenant_id=@tenant AND name='Decisión pendiente');

INSERT INTO pipeline_stages (tenant_id, name, color, order_index, is_default)
SELECT @tenant, 'Retomar más adelante', '#94A3B8', 8, 0
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE tenant_id=@tenant AND name='Retomar más adelante');
