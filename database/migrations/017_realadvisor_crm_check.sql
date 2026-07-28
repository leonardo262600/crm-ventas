ALTER TABLE daily_prospects
  ADD COLUMN realadvisor_crm_check VARCHAR(12) NOT NULL DEFAULT 'pendiente'
  AFTER call_angle;

CREATE INDEX idx_prospect_ra_check
  ON daily_prospects (tenant_id, realadvisor_crm_check);
