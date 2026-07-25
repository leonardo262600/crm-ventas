-- Métricas mensuales del closer.
ALTER TABLE opportunities
  ADD COLUMN cash_collected DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN commission_amount DECIMAL(15,2) DEFAULT 0;

-- Para ventas históricas, usamos el importe cerrado como cash collected inicial.
UPDATE opportunities
SET cash_collected = amount
WHERE status = 'won' AND (cash_collected IS NULL OR cash_collected = 0);
