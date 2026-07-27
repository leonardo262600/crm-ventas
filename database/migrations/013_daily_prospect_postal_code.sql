ALTER TABLE daily_prospects
  ADD COLUMN postal_code VARCHAR(10) NULL AFTER address;

UPDATE daily_prospects
SET postal_code = REGEXP_SUBSTR(address, '[0-9]{5}')
WHERE postal_code IS NULL
  AND address REGEXP '[0-9]{5}';
