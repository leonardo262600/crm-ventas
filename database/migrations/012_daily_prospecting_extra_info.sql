ALTER TABLE daily_prospects
  ADD COLUMN secondary_phone VARCHAR(80) NULL AFTER phone,
  ADD COLUMN secondary_email VARCHAR(255) NULL AFTER email,
  ADD COLUMN contact_person VARCHAR(255) NULL AFTER address,
  ADD COLUMN google_maps_url VARCHAR(700) NULL AFTER contact_person,
  ADD COLUMN extra_info TEXT NULL AFTER google_maps_url;
