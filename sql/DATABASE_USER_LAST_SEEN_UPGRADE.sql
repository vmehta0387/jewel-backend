SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'last_seen_at'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE users ADD COLUMN last_seen_at DATETIME NULL AFTER is_active',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
