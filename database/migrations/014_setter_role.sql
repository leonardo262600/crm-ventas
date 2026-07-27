ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','gerente','vendedor','setter') NOT NULL DEFAULT 'vendedor';
