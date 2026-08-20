-- User Profile Photo Upgrade
-- Adds optional profile photo URL for web and mobile avatar rendering.
-- Compatible with MySQL versions that do not support `ADD COLUMN IF NOT EXISTS`.

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'photo_url'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE users ADD COLUMN photo_url VARCHAR(1024) NULL AFTER phone',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
