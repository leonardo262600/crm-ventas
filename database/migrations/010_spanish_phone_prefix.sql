UPDATE daily_prospects
SET phone = CONCAT(
  '+34 ',
  SUBSTRING(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''),1,3), ' ',
  SUBSTRING(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''),4,3), ' ',
  SUBSTRING(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''),7,3)
)
WHERE tenant_id=1
  AND phone IS NOT NULL
  AND phone NOT LIKE '+34%'
  AND LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''))=9;
