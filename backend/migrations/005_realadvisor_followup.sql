-- CRM personal RealAdvisor: datos de demo, objeciones y seguimiento.
-- Ejecutar una sola vez sobre la base de datos actual.

ALTER TABLE opportunities
  ADD COLUMN client_type ENUM('agente','agencia','red') DEFAULT 'agencia' AFTER description,
  ADD COLUMN zone VARCHAR(200) DEFAULT NULL AFTER client_type,
  ADD COLUMN city VARCHAR(120) DEFAULT NULL AFTER zone,
  ADD COLUMN province VARCHAR(120) DEFAULT NULL AFTER city,
  ADD COLUMN offices_count INT DEFAULT NULL AFTER province,
  ADD COLUMN agents_count INT DEFAULT NULL AFTER offices_count,
  ADD COLUMN lead_source VARCHAR(120) DEFAULT NULL AFTER agents_count,
  ADD COLUMN demo_date DATETIME DEFAULT NULL AFTER lead_source,
  ADD COLUMN temperature ENUM('caliente','templada','fria') DEFAULT 'templada' AFTER demo_date,
  ADD COLUMN monthly_amount DECIMAL(15,2) DEFAULT 0 AFTER temperature,
  ADD COLUMN proposal_period VARCHAR(100) DEFAULT NULL AFTER monthly_amount,
  ADD COLUMN current_solution VARCHAR(200) DEFAULT NULL AFTER proposal_period,
  ADD COLUMN decision_maker VARCHAR(150) DEFAULT NULL AFTER current_solution,
  ADD COLUMN stakeholders VARCHAR(500) DEFAULT NULL AFTER decision_maker,
  ADD COLUMN main_goal TEXT DEFAULT NULL AFTER stakeholders,
  ADD COLUMN current_problem TEXT DEFAULT NULL AFTER main_goal,
  ADD COLUMN problem_impact TEXT DEFAULT NULL AFTER current_problem,
  ADD COLUMN current_acquisition TEXT DEFAULT NULL AFTER problem_impact,
  ADD COLUMN current_captures INT DEFAULT NULL AFTER current_acquisition,
  ADD COLUMN target_captures INT DEFAULT NULL AFTER current_captures,
  ADD COLUMN urgency VARCHAR(100) DEFAULT NULL AFTER target_captures,
  ADD COLUMN urgency_reason TEXT DEFAULT NULL AFTER urgency,
  ADD COLUMN decision_criteria TEXT DEFAULT NULL AFTER urgency_reason,
  ADD COLUMN client_quote TEXT DEFAULT NULL AFTER decision_criteria,
  ADD COLUMN objection_type VARCHAR(100) DEFAULT NULL AFTER client_quote,
  ADD COLUMN objection_detail TEXT DEFAULT NULL AFTER objection_type,
  ADD COLUMN objection_response TEXT DEFAULT NULL AFTER objection_detail,
  ADD COLUMN objection_status ENUM('pendiente','respondida','resuelta','no_resuelta') DEFAULT 'pendiente' AFTER objection_response,
  ADD COLUMN last_interaction_at DATETIME DEFAULT NULL AFTER objection_status,
  ADD COLUMN last_interaction_channel VARCHAR(50) DEFAULT NULL AFTER last_interaction_at,
  ADD COLUMN next_action VARCHAR(200) DEFAULT NULL AFTER last_interaction_channel,
  ADD COLUMN next_action_type VARCHAR(50) DEFAULT NULL AFTER next_action,
  ADD COLUMN next_action_at DATETIME DEFAULT NULL AFTER next_action_type,
  ADD COLUMN followup_attempts INT NOT NULL DEFAULT 0 AFTER next_action_at,
  ADD COLUMN latest_response TEXT DEFAULT NULL AFTER followup_attempts,
  ADD COLUMN decision_date DATE DEFAULT NULL AFTER latest_response,
  ADD COLUMN resume_date DATE DEFAULT NULL AFTER decision_date,
  ADD COLUMN lost_reason VARCHAR(120) DEFAULT NULL AFTER resume_date,
  ADD COLUMN lost_detail TEXT DEFAULT NULL AFTER lost_reason,
  ADD COLUMN competitor_chosen VARCHAR(150) DEFAULT NULL AFTER lost_detail,
  ADD COLUMN activation_date DATE DEFAULT NULL AFTER competitor_chosen,
  ADD COLUMN stage_entered_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER activation_date;

ALTER TABLE activities
  MODIFY COLUMN type ENUM('tarea','reunion','llamada','email','whatsapp','videollamada','recordatorio','nota') DEFAULT 'tarea',
  ADD COLUMN outcome VARCHAR(200) DEFAULT NULL AFTER description,
  ADD COLUMN contacted TINYINT(1) DEFAULT NULL AFTER outcome;

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
