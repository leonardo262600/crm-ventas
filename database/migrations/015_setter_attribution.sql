ALTER TABLE opportunities
  ADD COLUMN setter_id INT NULL AFTER assigned_to,
  ADD COLUMN setter_commission_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER commission_amount;

CREATE INDEX idx_opportunities_setter_status_close
  ON opportunities (tenant_id, setter_id, status, close_date);
