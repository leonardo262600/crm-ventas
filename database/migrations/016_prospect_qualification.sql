ALTER TABLE daily_prospects
  ADD COLUMN qualification_score TINYINT UNSIGNED NULL AFTER source_url,
  ADD COLUMN qualification_level VARCHAR(1) NULL AFTER qualification_score,
  ADD COLUMN qualification_reason VARCHAR(700) NULL AFTER qualification_level,
  ADD COLUMN call_angle VARCHAR(500) NULL AFTER qualification_reason;

CREATE INDEX idx_prospect_qualification
  ON daily_prospects (tenant_id, status, qualification_score);
